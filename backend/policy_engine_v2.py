from typing import List, Dict, Any, Tuple
from enum import Enum
import json
from psycopg2.extras import RealDictCursor

class PolicyAction(Enum):
    AUTO_APPROVED = "auto_approved"
    PENDING_APPROVAL = "pending_approval"
    AUTO_DENIED = "auto_denied"
    NO_MATCH = "no_match"

class PolicyEngine:
    def __init__(self, db_client_or_conn):
        self.db = db_client_or_conn
    
    def get_active_policies(self) -> List[Dict]:
        """Fetch all active policies with their conditions and actions."""
        cur = self.db.cursor(cursor_factory=RealDictCursor)
        policies = []
        try:
            # Get all active policies
            cur.execute("SELECT * FROM policies WHERE is_active = true ORDER BY priority DESC")
            policy_rows = cur.fetchall()
            
            for prow in policy_rows:
                policy = dict(prow)
                
                # Get conditions for this policy
                cur.execute("SELECT * FROM policy_conditions WHERE policy_id = %s", (prow['id'],))
                policy['conditions'] = [dict(c) for c in cur.fetchall()]
                
                # Get actions for this policy
                cur.execute("SELECT * FROM policy_actions WHERE policy_id = %s", (prow['id'],))
                policy['actions'] = [dict(a) for a in cur.fetchall()]
                
                policies.append(policy)
        finally:
            cur.close()
            
        return policies
    
    def evaluate_condition(self, condition: Dict, request: Dict) -> bool:
        """Evaluate a single condition against a request."""
        field = condition["field"]
        operator = condition["operator"]
        value = condition["value"]
        request_value = request.get(field)
        
        # If the request doesn't have the field, it doesn't match
        if request_value is None:
            # Special case for estimated_cost where 0 might be missing
            if field in ["estimated_cost", "monthly_spend"]:
                request_value = 0
            else:
                return False
        
        # Type coercion
        if field in ["estimated_cost", "monthly_spend"]:
            try:
                request_value = float(request_value)
                value = float(value)
            except ValueError:
                return False
        
        operators = {
            "eq": lambda a, b: str(a).lower() == str(b).lower() if isinstance(a, str) else a == b,
            "ne": lambda a, b: str(a).lower() != str(b).lower() if isinstance(a, str) else a != b,
            "gt": lambda a, b: a > b,
            "lt": lambda a, b: a < b,
            "gte": lambda a, b: a >= b,
            "lte": lambda a, b: a <= b,
            "in": lambda a, b: str(a).lower() in [v.strip().lower() for v in str(b).split(",")],
            "contains": lambda a, b: str(b).lower() in str(a).lower(),
        }
        
        try:
            return operators.get(operator, lambda a, b: False)(request_value, value)
        except Exception:
            return False
    
    def evaluate_policy(self, policy: Dict, request: Dict) -> bool:
        """Evaluate all conditions of a policy against a request."""
        conditions = policy.get("conditions", [])
        if not conditions:
            return True  # No conditions = always matches
        
        results = []
        for cond in conditions:
            result = self.evaluate_condition(cond, request)
            results.append((result, cond.get("logic_gate", "AND")))
        
        # Simple AND/OR evaluation (left-to-right)
        final = results[0][0]
        for i in range(1, len(results)):
            if results[i][1] == "AND":
                final = final and results[i][0]
            else:
                final = final or results[i][0]
        
        return final
    
    def evaluate_request(self, request: Dict) -> Tuple[PolicyAction, str, List[str]]:
        """
        Evaluate a request against all active policies.
        Returns: (decision, reason, matched_policies_list)
        Priority order: auto_deny > pending_approval > auto_approve > no_match
        """
        policies = self.get_active_policies()
        
        matched_policies = []
        for policy in policies:
            if self.evaluate_policy(policy, request):
                if not policy.get("actions"):
                    continue
                action = policy["actions"][0]  # Take first action
                
                # Format reason template if needed
                reason = action.get("reason_template", f"Matched policy: {policy['name']}")
                if "{estimated_cost}" in reason and "estimated_cost" in request:
                    reason = reason.replace("{estimated_cost}", str(request["estimated_cost"]))
                    
                matched_policies.append({
                    "policy_name": policy["name"],
                    "action": action["action_type"],
                    "reason": reason
                })
        
        matched_names = [p["policy_name"] for p in matched_policies]
        
        if not matched_policies:
            # Default: no policy matched, default to pending_approval for safety
            return PolicyAction.PENDING_APPROVAL, "No policy matched - defaulting to manual approval", matched_names
        
        # Priority resolution: deny beats pending, pending beats approve
        actions = [p["action"] for p in matched_policies]
        
        if "auto_denied" in actions or "auto_deny" in actions:
            deny_reasons = [p["reason"] for p in matched_policies if p["action"] in ("auto_denied", "auto_deny")]
            return PolicyAction.AUTO_DENIED, f"Denied by policy: {'; '.join(deny_reasons)}", matched_names
        
        if "pending_approval" in actions:
            pending_reasons = [p["reason"] for p in matched_policies if p["action"] == "pending_approval"]
            return PolicyAction.PENDING_APPROVAL, f"Requires approval: {'; '.join(pending_reasons)}", matched_names
        
        # All matched policies are auto_approve
        return PolicyAction.AUTO_APPROVED, f"Auto-approved: {'; '.join(p['reason'] for p in matched_policies)}", matched_names
