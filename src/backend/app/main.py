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
from docx2pdf import convert


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

@app.post("/convert")
async def convert_file(
    file: UploadFile = File(None)
):
    try:
        if not file:
            raise HTTPException(status_code=400, detail="Provide a file")

        filename: Path = Path(file.filename)
        file_type: str = filename.suffix
        content: bytes = await file.read()
        extracted_text = ""

        with open(f"{file.filename}", "wb") as f:  # saves to the build folder
            f.write(content)

        # not always 100% successful if pdfs are complicated or encoded in a way that it cannot parse
        if file_type == ".pdf":
            reader = pypdf.PdfReader(f"{file.filename}")

            num_pages_pdf = len(reader.pages)

            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"

        else:
            # Get the number of pages by converting to pdf, does not seem possible to get pages from a docx file directly
            convert(filename, "file.pdf")
            reader = pypdf.PdfReader("file.pdf")
            num_pages_pdf = len(reader.pages)


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
        return {'extracted_text': extracted_text, 'pages': num_pages_pdf}
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
