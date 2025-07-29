import argparse
import boto3
import subprocess
import base64


def get_ecr_login_password(region):
    """Get ECR login password."""
    try:
        ecr_client = boto3.client("ecr", region_name=region)
        response = ecr_client.get_authorization_token()
        token = response["authorizationData"][0]["authorizationToken"]
        return base64.b64decode(token).decode("utf-8").split(":")[1]
    except Exception as e:
        print(f"Error getting ECR login password: {e}")
        exit(1)


def docker_login(region, account_id, password):
    """Login to ECR."""
    try:
        login_cmd = (
            f"docker login --username AWS --password-stdin "
            f"{account_id}.dkr.ecr.{region}.amazonaws.com"
        )
        subprocess.run(
            login_cmd,
            input=password.encode("utf-8"),
            shell=True,
            check=True,
        )
        print("Docker login successful.")
    except subprocess.CalledProcessError as e:
        print(f"Error during Docker login: {e}")
        exit(1)


def build_and_push(service, region, account_id):
    """Build and push Docker image to ECR."""
    image_name = f"nhs-test-notifyai-{service}"
    ecr_repo = f"{account_id}.dkr.ecr.{region}.amazonaws.com/{image_name}"
    latest_tag = f"{ecr_repo}:latest"

    service_paths = {
        "frontend": "src/frontend/notifai-uploader",
        "backend": "src/backend/app",
    }
    build_path = service_paths[service]

    try:
        # Build the Docker image
        build_cmd = (
            f"docker build -t {image_name} . --provenance false --platform linux/amd64"
        )
        print(f"Running build for {service}: {build_cmd}")
        subprocess.run(
            build_cmd,
            shell=True,
            check=True,
            cwd=build_path,
        )
        print(f"Docker image for {service} built successfully.")

        # Tag the Docker image
        tag_cmd = f"docker tag {image_name}:latest {latest_tag}"
        print(f"Tagging image: {tag_cmd}")
        subprocess.run(tag_cmd, shell=True, check=True)
        print("Docker image tagged successfully.")

        # Push the Docker image
        push_cmd = f"docker push {latest_tag}"
        print(f"Pushing image: {push_cmd}")
        subprocess.run(push_cmd, shell=True, check=True)
        print(f"Docker image for {service} pushed successfully to {latest_tag}.")

    except subprocess.CalledProcessError as e:
        print(f"Error during Docker build/push for {service}: {e}")
        exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Build and push Docker images to AWS ECR."
    )
    parser.add_argument(
        "--service",
        choices=["frontend", "backend"],
        help="Specify the service to deploy (frontend or backend).",
    )
    args = parser.parse_args()

    region = "eu-west-2"
    account_id = "767397886959"

    password = get_ecr_login_password(region)
    docker_login(region, account_id, password)

    if args.service:
        build_and_push(args.service, region, account_id)
    else:
        build_and_push("frontend", region, account_id)
        build_and_push("backend", region, account_id)


if __name__ == "__main__":
    main()
