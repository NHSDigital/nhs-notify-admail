#!/bin/bash

# Script to build an AWS Lambda deployment package for bedrock_alerts
set -e


BUILD_DIR="lambda_build"
ZIP_FILE="evaluations_alerts.zip"


echo "Creating build directory: $BUILD_DIR"
mkdir -p "$BUILD_DIR"

if [ -f "requirements.txt" ]; then
    echo "Installing dependencies from requirements.txt to $BUILD_DIR"
    pip install -r requirements.txt -t "$BUILD_DIR"
else
    echo "Error: requirements.txt not found"
    exit 1
fi

echo "Creating bedrock_alerts package in $BUILD_DIR"
mkdir -p "$BUILD_DIR/bedrock_alerts"

for file in evaluations_alert_lambda.py evaluations_alert_service.py; do
    if [ -f "$file" ]; then
        echo "Copying $file to $BUILD_DIR/bedrock_alerts/"
        cp "$file" "$BUILD_DIR/bedrock_alerts/"
    else
        echo "Error: $file not found"
        exit 1
    fi
done

if [ -f "bedrock_alerts/__init__.py" ]; then
    echo "Copying bedrock_alerts/__init__.py to $BUILD_DIR/bedrock_alerts/"
    cp "bedrock_alerts/__init__.py" "$BUILD_DIR/bedrock_alerts/"
else
    echo "Warning: bedrock_alerts/__init__.py not found, creating empty file"
    touch "$BUILD_DIR/bedrock_alerts/__init__.py"
fi

echo "Creating zip file: $ZIP_FILE"
cd "$BUILD_DIR"
zip -r "../$ZIP_FILE" .
cd ..

echo "Lambda package created successfully: $ZIP_FILE"
