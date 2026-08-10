import os
import sys
import json
import urllib.request
import urllib.error

def main():
    request_id = os.environ.get("REQUEST_ID")
    api_url = os.environ.get("API_URL", "http://localhost:8000")
    is_failed = os.environ.get("FAILED") == "true"

    if not request_id:
        print("Missing REQUEST_ID environment variable.")
        sys.exit(1)

    url = f"{api_url}/api/requests/{request_id}/status"

    if is_failed:
        data = {
            "status": "failed",
            "connection_string": None,
            "aws_resource_id": None
        }
        print(f"Updating request {request_id} to 'failed'...")
    else:
        connection_string = os.environ.get("TF_OUT_CONNECTION_STRING")
        aws_resource_id = os.environ.get("TF_OUT_AWS_RESOURCE_ID")

        if not connection_string or not aws_resource_id:
            print("Missing TF_OUT_CONNECTION_STRING or TF_OUT_AWS_RESOURCE_ID.")
            sys.exit(1)

        data = {
            "status": "ready",
            "connection_string": connection_string,
            "aws_resource_id": aws_resource_id
        }
        print(f"Updating request {request_id} to 'ready'...")

    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"Status updated successfully: {result}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode()}")
        sys.exit(1)
    except Exception as e:
        print(f"Error updating status: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
