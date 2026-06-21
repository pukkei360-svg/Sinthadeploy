#!/usr/bin/env python3
"""Remove `variant: 'destructive'` from toast() calls (standalone lines)."""
import re
import os

files = [
    'src/components/sintha/AdminUsersScreen.tsx',
    'src/components/sintha/SinthaProScreen.tsx',
    'src/components/sintha/ReportProviderScreen.tsx',
    'src/components/sintha/RoleSelectScreen.tsx',
    'src/components/sintha/AdminCategoriesScreen.tsx',
    'src/components/sintha/AdminClaimsScreen.tsx',
    'src/components/sintha/BookingFormScreen.tsx',
    'src/components/sintha/ProfileScreen.tsx',
    'src/components/sintha/BookingDetailScreen.tsx',
    'src/components/sintha/AdminVerificationsScreen.tsx',
    'src/components/sintha/AuthScreen.tsx',
    'src/components/sintha/VerificationScreen.tsx',
]

base = '/home/z/my-project'
pattern = re.compile(r"^\s*variant:\s*'destructive',?\s*$")
count = 0

for f in files:
    path = os.path.join(base, f)
    if not os.path.exists(path):
        continue
    with open(path) as fh:
        content = fh.read()

    lines = content.split('\n')
    new_lines = []
    in_toast = False
    toast_depth = 0

    for line in lines:
        stripped = line.strip()

        if 'toast(' in line and '{' in line:
            in_toast = True
            toast_depth = line.count('{') - line.count('}')
        elif in_toast:
            toast_depth += line.count('{') - line.count('}')
            if toast_depth <= 0:
                in_toast = False

        if in_toast and pattern.match(line):
            continue

        new_lines.append(line)

    new_content = '\n'.join(new_lines)

    if new_content != content:
        with open(path, 'w') as fh:
            fh.write(new_content)
        print(f'  ✓ {f}')
        count += 1

print(f'{count} files updated')
