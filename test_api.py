import urllib.request, json
req = urllib.request.Request('http://localhost:8000/api/policies/preview', data=b'{"environment": "dev", "instance_size": "small", "resource_type": "postgres", "estimated_cost": 15, "requester_email": "test@example.com"}', headers={'Content-Type': 'application/json'}, method='POST')
try:
    res = urllib.request.urlopen(req)
    print(res.read().decode())
except Exception as e:
    print(e.code)
    print(e.read().decode())
