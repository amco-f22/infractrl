import sys
sys.path.append("d:/DevOps/Projects/infractl-simple/backend")
from main import PolicyPreviewRequest
try:
    req = PolicyPreviewRequest(**{"environment": "dev", "instance_size": "small", "resource_type": "postgres", "estimated_cost": 15, "requester_email": "test@example.com"})
    print("Valid!")
except Exception as e:
    print(e)
