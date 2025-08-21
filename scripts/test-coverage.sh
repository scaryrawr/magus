#!/bin/bash
# Test coverage calculation logic locally

echo "🧪 Testing coverage calculation..."

COVERAGE_JSON="./coverage/coverage-final.json"

if [ -f "$COVERAGE_JSON" ]; then
    echo "✅ Coverage file found"
    
    # Test the Node.js calculation script
    STMT_COVERED=$(node -e "
        const fs = require('fs');
        const coverage = JSON.parse(fs.readFileSync('$COVERAGE_JSON'));
        let totalStmts = 0, coveredStmts = 0;
        Object.values(coverage).forEach(file => {
            if (file.s) {
                Object.values(file.s).forEach(count => {
                    totalStmts++;
                    if (count > 0) coveredStmts++;
                });
            }
        });
        console.log(totalStmts > 0 ? ((coveredStmts / totalStmts) * 100).toFixed(2) : '0');
    ")
    
    echo "📊 Calculated statement coverage: ${STMT_COVERED}%"
    
    # Test badge color logic
    COLOR=$(node -e "
        const coverage = parseFloat('$STMT_COVERED');
        if (coverage >= 80) console.log('brightgreen');
        else if (coverage >= 60) console.log('yellow');
        else console.log('red');
    ")
    
    echo "🎨 Badge color: $COLOR"
    echo "🏷️  Badge URL: https://img.shields.io/badge/coverage-${STMT_COVERED}%25-${COLOR}"
    
    echo "✅ Coverage calculation test completed successfully!"
else
    echo "❌ Coverage file not found. Run 'bun test' first."
    exit 1
fi
