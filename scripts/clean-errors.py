#!/usr/bin/env python3
"""
Bulk-replace ugly error displays with cleanError() + non-red toasts.

Replaces patterns like:
  description: (err as Error).message
  description: err instanceof Error ? err.message : 'Unknown error'
  description: (err as Error).message || 'Failed to start payment'

With:
  description: cleanError(err)

Also removes `variant: 'destructive'` from toasts so they're black,
not red.
"""

import os
import re

FILES = [
    'src/components/sintha/AdminVerificationsScreen.tsx',
    'src/components/sintha/ReportProviderScreen.tsx',
    'src/components/sintha/RoleSelectScreen.tsx',
    'src/components/sintha/AdminCategoriesScreen.tsx',
    'src/components/sintha/AdminClaimsScreen.tsx',
    'src/components/sintha/BookingFormScreen.tsx',
    'src/components/sintha/AdminUsersScreen.tsx',
    'src/components/sintha/ProfileScreen.tsx',
    'src/components/sintha/SinthaProScreen.tsx',
    'src/components/sintha/BookingDetailScreen.tsx',
]

BASE = '/home/z/my-project'

def transform(content: str) -> str:
    # Pattern 1: description: (err as Error).message
    content = re.sub(
        r"description: \(err as Error\)\.message(?: \|\| '[^']*')?",
        'description: cleanError(err)',
        content
    )

    # Pattern 2: description: err instanceof Error ? err.message : '...'
    content = re.sub(
        r"description: err instanceof Error \? err\.message : '[^']*'",
        'description: cleanError(err)',
        content
    )

    # Pattern 3: description: (err as Error).message || '...'
    # (already handled by pattern 1's optional group, but just in case)
    content = re.sub(
        r"description: \(err as Error\)\.message \|\| '[^']*'",
        'description: cleanError(err)',
        content
    )

    # Remove `variant: 'destructive'` from toast calls so they're black
    # Match: , variant: 'destructive' } or , variant: 'destructive' })
    # Be careful not to remove it from Button components — only toasts
    # Actually, the user said to use black instead of red for errors.
    # The toast variant: 'destructive' makes it red. Removing it makes it dark.
    # But Button variant: 'destructive' is for the ban/reject buttons — keep those.
    # So only remove from toast() calls.
    # This is tricky with regex — let's be conservative and only remove
    # `variant: 'destructive'` when it's inside a toast({ ... }) call.
    # 
    # Simple approach: remove `variant: 'destructive'` when the line
    # also contains 'toast' or 'description'
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        if "variant: 'destructive'" in line and ('toast' in line or 'description' in line or 'title:' in line):
            # Remove the variant: 'destructive' part
            line = re.sub(r",?\s*variant: 'destructive'", '', line)
            # Clean up any trailing commas before }
            line = re.sub(r',\s*}', '}', line)
        new_lines.append(line)
    content = '\n'.join(new_lines)

    return content


def add_import(content: str) -> str:
    """Add the cleanError import if not already present."""
    if 'cleanError' in content and 'clean-error' in content:
        return content  # Already imported
    
    # Find the last import line and add after it
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith('import ') or (line.startswith("from '") and i > 0):
            last_import_idx = i
        elif line.strip() == '' and last_import_idx >= 0 and i > last_import_idx:
            break
    
    if last_import_idx >= 0:
        # Check if the file imports from '@/lib/api' — if so, add clean-error import nearby
        import_line = "import { cleanError } from '@/lib/clean-error'"
        # Insert after the last import
        lines.insert(last_import_idx + 1, import_line)
        content = '\n'.join(lines)
    
    return content


count = 0
for rel_path in FILES:
    full_path = os.path.join(BASE, rel_path)
    if not os.path.exists(full_path):
        print(f"  SKIP (not found): {rel_path}")
        continue
    
    with open(full_path, 'r') as f:
        original = f.read()
    
    modified = transform(original)
    
    # Only add import if we actually changed something
    if modified != original:
        modified = add_import(modified)
        with open(full_path, 'w') as f:
            f.write(modified)
        print(f"  ✓ Updated: {rel_path}")
        count += 1
    else:
        print(f"  - No changes: {rel_path}")

print(f"\n{count} file(s) updated")
