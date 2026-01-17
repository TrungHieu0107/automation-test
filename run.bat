@echo off
REM Run specific test list
node test-engine.js config.yaml D:/learn/automation_test/tests/test-lists/approval-workflow.yaml

REM Or use full path
REM node test-engine.js config.yaml D:/test-configs/test-lists/approval-workflow.yaml