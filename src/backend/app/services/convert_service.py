import logging
import os
import pypdf
from pathlib import Path
import subprocess
from fastapi import UploadFile, HTTPException
from app.core.constants import CONVERTED_FILE_NAME

logger = logging.getLogger(__name__)


async def convert_file_service(file: UploadFile):
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

        else:
            # Run Pandoc to convert the file from commandline
            command = [
                "pandoc",
                file.filename,
                "-o",
                CONVERTED_FILE_NAME,
            ]
            completed_process = subprocess.run(command, check=True, capture_output=True)

            reader = pypdf.PdfReader(f"{file.filename}")
            page_count += len(reader.pages)

            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"

            try:
                # finally remove file:
                os.remove(CONVERTED_FILE_NAME)
                os.remove(f"{file.filename}")

                logger.info(
                    f"File '{CONVERTED_FILE_NAME}' and '{file.filename}'deleted successfully."
                )
            except Exception as e:
                logger.error(e)
        return {'extracted_text': extracted_text, 'pages':page_count}
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
