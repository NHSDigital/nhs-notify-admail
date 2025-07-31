from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import pypdf
from pathlib import Path
import subprocess
from docx2pdf import convert
from app.core.auth import (
    AuthMiddleware,
    CognitoAuthenticator,
    NotFoundExceptionHandler,
)
from app.routers import convert
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

authenticator = CognitoAuthenticator()

app.add_middleware(AuthMiddleware, authenticator=authenticator)
app.add_exception_handler(404, NotFoundExceptionHandler(authenticator))

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://[a-z0-9]+\.[a-z0-9\-]+\.awsapprunner\.com$",  # Regex for App Runner URLs only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert.router)
