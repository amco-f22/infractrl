from enum import Enum

class ApprovalDecision(Enum):
    AUTO_APPROVED = "auto_approved"
    PENDING_APPROVAL = "pending_approval"
    AUTO_DENIED = "auto_denied"

POLICY_RULES = {
    "auto_approve": {
        "environments": ["dev"],
        "sizes": ["small"],
        "max_monthly_cost": 15.00,
        "resource_types": ["postgres"],
    },
    "auto_deny": {
        "max_monthly_cost": 100.00,  # Hard ceiling, no approval possible
    }
}

class RequestContext:
    def __init__(self, resource_type, environment, instance_size, estimated_cost):
        self.resource_type = resource_type.lower()
        self.environment = environment.lower()
        self.instance_size = instance_size.lower()
        self.estimated_cost = estimated_cost

def evaluate_request(request: RequestContext, user_budget_remaining: float):
    """
    Evaluates an infrastructure request against defined policies.
    Returns: (ApprovalDecision, reason)
    """
    # Rule 1: Hard cost ceiling — auto-deny, no appeal
    if request.estimated_cost > POLICY_RULES["auto_deny"]["max_monthly_cost"]:
        return ApprovalDecision.AUTO_DENIED, \
               f"Request exceeds hard cost ceiling of ${POLICY_RULES['auto_deny']['max_monthly_cost']}"
    
    # Rule 2: Auto-approve if all criteria match
    auto = POLICY_RULES["auto_approve"]
    if (request.environment in auto["environments"] and
        request.instance_size in auto["sizes"] and
        request.resource_type in auto["resource_types"] and
        request.estimated_cost <= auto["max_monthly_cost"] and
        user_budget_remaining >= request.estimated_cost):
        return ApprovalDecision.AUTO_APPROVED, \
               "Request matches auto-approve policy"
    
    # Rule 3: Everything else goes to manual approval
    return ApprovalDecision.PENDING_APPROVAL, \
           "Request requires manual approval (non-dev environment, large size, or high cost)"
