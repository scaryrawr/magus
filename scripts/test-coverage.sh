#!/bin/bash
# Test coverage calculation logic locally

echo "🧪 Testing coverage calculation..."

COVERAGE_LCOV="./coverage/lcov.info"

if [ -f "$COVERAGE_LCOV" ]; then
    echo "✅ Coverage file found"
    
    # Test the Node.js calculation script for LCOV format
    COVERAGE_PERCENT=$(node -e "
        const fs = require('fs');
        const lcov = fs.readFileSync('$COVERAGE_LCOV', 'utf8');
        
        // Parse LCOV format for line coverage
        const lines = lcov.split('\n');
        let totalLines = 0;
        let coveredLines = 0;
        
        for (const line of lines) {
          if (line.startsWith('LF:')) {
            totalLines += parseInt(line.split(':')[1] || '0');
          } else if (line.startsWith('LH:')) {
            coveredLines += parseInt(line.split(':')[1] || '0');
          }
        }
        
        const percentage = totalLines > 0 ? ((coveredLines / totalLines) * 100) : 0;
        console.log(percentage.toFixed(2));
    ")
    
    echo "📊 Calculated line coverage: ${COVERAGE_PERCENT}%"
    
    # Test badge color logic
    COLOR=$(node -e "
        const coverage = parseFloat('$COVERAGE_PERCENT');
        if (coverage >= 80) console.log('brightgreen');
        else if (coverage >= 60) console.log('yellow');
        else console.log('red');
    ")
    
    echo "🎨 Badge color: $COLOR"
    echo "🏷️  Badge URL: https://img.shields.io/badge/coverage-${COVERAGE_PERCENT}%25-${COLOR}"
    
    echo "✅ Coverage calculation test completed successfully!"
else
    echo "❌ Coverage file not found. Run 'bun test --coverage --coverage-reporter=lcov' first."
    exit 1
fi
