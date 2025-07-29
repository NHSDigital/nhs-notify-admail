import logging
import os
import pypdf
from pathlib import Path
import subprocess
from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)


async def convert_file_service(file: UploadFile):
    try:
        filename: Path = Path(file.filename)
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
