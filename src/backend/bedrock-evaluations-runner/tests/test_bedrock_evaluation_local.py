
import os
from unittest.mock import patch, MagicMock
import importlib
import bedrock_evaluation_local

@patch.dict(os.environ, {
    "EVALUATOR_MODEL_IDENTIFIER": "eval-model",
    "INFERENCE_MODEL_IDENTIFIER": "gen-model",
    "ROLE_ARN": "arn:aws:iam::123456789:role/test",
    "INPUT_PROMPT_S3_URI": "s3://input",
    "RESULTS_S3_URI": "s3://output",
    "AWS_REGION": "eu-west-2"
})
@patch("boto3.client")
def test_bedrock_evaluation_local_main(mock_boto_client):

    with patch("builtins.print") as mock_print:
        importlib.reload(bedrock_evaluation_local)
        assert mock_boto_client.return_value.create_evaluation_job.called
        printed = " ".join(str(call) for call in mock_print.call_args_list)
        assert "Creating model evaluation job" in printed
        assert "Created model evaluation job" in printed
        assert "View the evaluation's progress" in printed
