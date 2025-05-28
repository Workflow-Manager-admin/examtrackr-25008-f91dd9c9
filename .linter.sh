#!/bin/bash
cd /home/kavia/workspace/code-generation/examtrackr-25008-f91dd9c9/examtrackr_main_container
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

