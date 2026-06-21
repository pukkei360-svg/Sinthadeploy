#!/usr/bin/env python3
"""
Replace db.notification.create({ data: { ... } }) → createNotificationWithPush({ ... })
Replace db.notification.createMany({ data: [...] }) → createNotificationsWithPush([...])

Handles the common patterns used across SINTHA's API routes.
"""
import re
import os

BASE = '/home/z/my-project'

FILES = [
    'src/app/api/reviews/route.ts',
    'src/app/api/razorpay/verify/route.ts',
    'src/app/api/razorpay/webhook/route.ts',
    'src/app/api/razorpay/check-payment/route.ts',
    'src/app/api/claims/route.ts',
    'src/app/api/jobs/route.ts',
    'src/app/api/jobs/[id]/route.ts',
    'src/app/api/jobs/[id]/quotes/route.ts',
    'src/app/api/jobs/[id]/quotes/[quoteId]/route.ts',
    'src/app/api/admin/claims/[id]/route.ts',
    'src/app/api/auth/sync/route.ts',
    'src/app/api/verification/[id]/route.ts',
    'src/app/api/chat/conversations/[id]/messages/route.ts',
    'src/app/api/bookings/route.ts',
    'src/app/api/bookings/[id]/route.ts',
]

count = 0

for rel_path in FILES:
    full_path = os.path.join(BASE, rel_path)
    if not os.path.exists(full_path):
        print(f"  SKIP (not found): {rel_path}")
        continue

    with open(full_path, 'r') as f:
        content = f.read()

    original = content
    modified = False

    # Pattern 1: Replace db.notification.create({\n  data: { → createNotificationWithPush({
    # And remove the corresponding closing },
    # 
    # The pattern is:
    #   db.notification.create({
    #     data: {
    #       ...fields...
    #     },
    #   });
    #
    # We need to:
    # 1. Replace "db.notification.create({\n<ws>data: {" → "createNotificationWithPush({"
    # 2. Remove the closing "},\n<ws>});" → ");"
    
    # Step 1: Replace the opening
    content = re.sub(
        r'await\s+db\.notification\.create\(\{\s*\n\s*data:\s*\{',
        'await createNotificationWithPush({',
        content
    )
    
    # Also handle without 'await'
    content = re.sub(
        r'db\.notification\.create\(\{\s*\n\s*data:\s*\{',
        'createNotificationWithPush({',
        content
    )

    # Step 2: Remove the closing "},\n  });" pattern that was after data fields
    # The pattern is: "    },\n  });" → "    });"
    # But we need to be careful — this pattern might appear in other contexts too.
    # Since we already replaced the opening, the closing should match.
    # 
    # The closing pattern after our replacement looks like:
    #   createNotificationWithPush({
    #     userId: ...,
    #     title: ...,
    #     ...
    #   },        ← this was the closing of data: {  }, 
    # });         ← this was the closing of the outer {}
    #
    # We need to remove the "},\n  });" and replace with just ");"
    # But the indentation varies. Let's match: "},\n\s*});" → ");"
    
    # Only do this replacement if we actually changed something
    if content != original:
        # Remove the "},\n<ws>});" → ");" pattern
        # This closes the data: {} wrapper and the outer create() call
        content = re.sub(
            r'\},\n\s*\}\);',
            '});',
            content
        )
        modified = True

    # Pattern 2: Replace db.notification.createMany({\n  data: ... }) 
    # → createNotificationsWithPush(...)
    if 'db.notification.createMany(' in content:
        # Pattern: db.notification.createMany({\n  data: <expr>\n})
        # → createNotificationsWithPush(<expr>)
        
        # Match: createMany({\n<ws>data: <expr>\n<ws>})
        content = re.sub(
            r'db\.notification\.createMany\(\{\s*\n\s*data:\s*([^}]+)\n\s*\}\)',
            r'createNotificationsWithPush(\1)',
            content
        )
        
        # Also handle multi-line expressions with nested braces
        # This is harder — let's do a simpler pattern for the .map() case
        # db.notification.createMany({\n  data: admins.map(...)\n})
        # Already handled by the above regex since .map(...) doesn't have } inside
        
        # Also handle arrays: data: [{ ... }, { ... }]
        # These have } inside so the regex above won't match. Let's handle separately.
        # For now, these will need manual fixing.
        
        if 'db.notification.createMany(' not in content:
            modified = True

    if not modified and content != original:
        modified = True

    # Add import if we modified anything
    if modified and 'createNotificationWithPush' in content:
        if "from '@/lib/notify'" not in content:
            # Find the last import line
            lines = content.split('\n')
            last_import = -1
            for i, line in enumerate(lines):
                if line.startswith('import ') or line.startswith("} from "):
                    last_import = i
                elif line.strip() == '' and last_import >= 0 and i > last_import + 1:
                    break
            
            if last_import >= 0:
                # Check what we need to import
                needs_single = 'createNotificationWithPush(' in content
                needs_many = 'createNotificationsWithPush(' in content
                
                imports = []
                if needs_single:
                    imports.append('createNotificationWithPush')
                if needs_many:
                    imports.append('createNotificationsWithPush')
                
                import_line = f"import {{ {', '.join(imports)} }} from '@/lib/notify';"
                lines.insert(last_import + 1, import_line)
                content = '\n'.join(lines)

    if content != original:
        with open(full_path, 'w') as f:
            f.write(content)
        print(f"  ✓ {rel_path}")
        count += 1
    else:
        print(f"  - No changes: {rel_path}")

print(f"\n{count} file(s) updated")
print("\nRun lint to check for issues: npx eslint src/app/api/**/*.ts")
