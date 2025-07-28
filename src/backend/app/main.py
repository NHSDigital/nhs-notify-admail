from fastapi import (
    FastAPI,
    File,
    UploadFile,
    HTTPException,
    Depends,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import (
    HTTPBasic,
    HTTPBasicCredentials,
)
import logging
import os
import pypdf
from pathlib import Path
import subprocess

# from app.bedrock_call import bedrock_call
import json
import boto3

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# # Configure CORS
# origins = [
#     "https://feat-nhs-style-app.d26faqe6jgq9y9.amplifyapp.com",  # Your frontend origin
#     # Add other origins if needed (e.g., for local testing: "http://localhost:3000")
# ]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://[a-z0-9]+\.[a-z0-9\-]+\.awsapprunner\.com$",  # Regex for App Runner URLs only
    # allow_origins=origins,  # List of allowed origins
    allow_credentials=True,  # Allow cookies/auth credentials if needed
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

security = HTTPBasic()


def get_env_credentials():
    env_username = os.getenv("ENV_BASIC_AUTH_USERNAME")
    env_password = os.getenv("ENV_BASIC_AUTH_PASSWORD")

    if not env_username or not env_password:
        logger.error(
            "ENV_BASIC_AUTH_USERNAME or ENV_BASIC_AUTH_PASSWORD environment variables are not set."
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server basic authentication credentials not configured.",
        )
    return env_username, env_password


def authenticate_user(credentials: HTTPBasicCredentials = Depends(security)):
    auth_username, auth_password = get_env_credentials()

    if not (
        credentials.username == auth_username and credentials.password == auth_password
    ):
        logger.warning(
            f"Failed basic authentication attempt for user: {credentials.username}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    logger.info(f"Successfully authenticated user: {credentials.username}")
    return credentials.username


@app.get("/")
async def root(
    username: str = Depends(authenticate_user),
):
    return {"message": "Welcome to the File Converter API"}


@app.post("/authorize")
async def authorize(username: str = Depends(authenticate_user)):
    return {"message": f"Authenticated as {username}"}


@app.post("/convert")
async def convert_file(
    file: UploadFile = File(None), username: str = Depends(authenticate_user)
):
    if not file or file.filename == "":
            raise HTTPException(status_code=400, detail="Provide a file")

    try:

        logger.info(f"Received file: {file.filename} of type {file.content_type}")
        filename: Path = Path(file.filename) # type: ignore
        file_type: str = filename.suffix
        content: bytes = await file.read()
        extracted_text = ""

        with open(f"{file.filename}", "wb") as f:  # saves to the build folder
            f.write(content)

        # not always 100% successful if pdfs are complicated or encoded in a way that it cannot parse
        if file_type == ".pdf":
            reader = pypdf.PdfReader(f"{file.filename}")

            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"

        else:
            # Run Pandoc to convert the file from commandline
            command = [
                "pandoc",
                file.filename,
                "-o",
                "file.txt",
            ]
            completed_process = subprocess.run(command, check=True, capture_output=True)

            # Read the converted file
            with open("file.txt", "rb") as f:
                converted_data = f.read()
                extracted_text = converted_data

            # prompt_resp = bedrock_call(extracted_text)
            logger.info("We have the prompt response")
            logger.info(extracted_text)

            try:
                # finally remove file:
                os.remove("file.txt")
                os.remove(f"{file.filename}")

                logger.info(
                    f"File 'file.txt' and '{file.filename}'deleted successfully."
                )
            except Exception as e:
                logger.error(e)
        return extracted_text
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
