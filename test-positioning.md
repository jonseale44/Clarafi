# Positioning Test Case

Use this simple test to verify the positioning system:

```
A B C
D E F
G H I
```

## Test Steps:
1. Create new template with the text above
2. Click immediately after each letter (A, B, C, D, E, F)
3. Add instruction with same letter name (click after A, add "A")
4. Generate template

## Expected Result:
```
A {{A}} B {{B}} C {{C}}
D {{D}} E {{E}} F {{F}}
G H I
```

## What This Tests:
- Horizontal positioning (within same line)
- Vertical positioning (across different lines)
- Character-level precision
- Multiple insertions in sequence

If positioning works correctly, each {{letter}} should appear immediately after the corresponding letter.