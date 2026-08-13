import sys
sys.path.append('.')
from scripts.cleanup import destroy_infrastructure
request = {
    'id': '6fd086ff-fade-4c5b-8a22-552312aeebdc',
    'aws_resource_id': 'infractl-6fd086ff-fade-4c5b-8a22-552312aeebdc',
    'resource_type': 'postgres',
    'instance_size': 'small',
    'requester_email': 'test@example.com',
    'environment': 'dev'
}
destroy_infrastructure(request)
