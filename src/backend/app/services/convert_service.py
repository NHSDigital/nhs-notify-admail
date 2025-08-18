import logging
import os
import pypdf
from pathlib import Path
import subprocess
from fastapi import UploadFile, HTTPException
from app.core.constants import CONVERTED_FILE_NAME

logger = logging.getLogger(__name__)


async def convert_file_service(file: UploadFile):
    response_obj = {"extracted_text": ""}

    try:
        filename: Path = Path(file.filename)
        file_type: str = filename.suffix
        content: bytes = await file.read()
        extracted_text = ""
        page_count = 0

        with open(f"{file.filename}", "wb") as f:  # saves to the build folder
            f.write(content)

        # not always 100% successful if pdfs are complicated or encoded in a way that it cannot parse
        if file_type == ".pdf":
            reader = pypdf.PdfReader(f"{file.filename}")
            page_count += len(reader.pages)

            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"

            response_obj["extracted_text"] = extracted_text.strip()
            response_obj["pages"] = page_count
            response_obj["file_type"] = "pdf"

        else:
            # Run Pandoc to convert the file from commandline
            command = [
                "pandoc",
                file.filename,
                "-o",
                CONVERTED_FILE_NAME,
            ]
            completed_process = subprocess.run(command, check=True, capture_output=True)

            # Read the converted file
            with open(CONVERTED_FILE_NAME, "rb") as f:
                converted_data = f.read()
                response_obj["extracted_text"] = converted_data
                response_obj["pages"] = None
                response_obj["file_type"] = "docx"

        try:
            # finally remove file:
            os.remove(CONVERTED_FILE_NAME)
            os.remove(f"{file.filename}")

            logger.info(
                f"File '{CONVERTED_FILE_NAME}' and '{file.filename}'deleted successfully."
            )
        except Exception as e:
            logger.error(e)
        return response_obj
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
