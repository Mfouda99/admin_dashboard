from django.contrib.auth.models import User
from accounts.models import Profile

# QA accounts to create
qa_accounts = [
    {
        "email": "Rewan.yasser@kentbusinesscollege.com",
        "username": "Rewan.yasser",
        "password": "Rewan@kent",
        "first_name": "Rewan",
        "last_name": "Yasser"
    },
    {
        "email": "Ahmed.Lotfi@kentbusinesscollege.com",
        "username": "Ahmed.Lotfi",
        "password": "Lotfi@kent6",
        "first_name": "Ahmed",
        "last_name": "Lotfi"
    },
    {
        "email": "Khaled.Ashraf@kentbusinesscollege.com",
        "username": "Khaled.Ashraf",
        "password": "k.z22112000k.z16",
        "first_name": "Khaled",
        "last_name": "Ashraf"
    },
    {
        "email": "office@kentbusinesscollege.org",
        "username": "office",
        "password": "KBCAi.123456",
        "first_name": "Office",
        "last_name": "Admin"
    }
]

print("Creating QA Accounts...")
print("=" * 60)

for account in qa_accounts:
    email = account["email"]
    username = account["username"]
    password = account["password"]
    first_name = account["first_name"]
    last_name = account["last_name"]
    
    # Check if user already exists (by email or username)
    user = None
    try:
        user = User.objects.get(email=email)
        print(f"\n✓ User with email {email} already exists. Updating...")
        user.username = username
        user.set_password(password)
        user.first_name = first_name
        user.last_name = last_name
        user.save()
    except User.DoesNotExist:
        # Check by username
        try:
            user = User.objects.get(username=username)
            print(f"\n✓ User with username {username} already exists. Updating...")
            user.email = email
            user.set_password(password)
            user.first_name = first_name
            user.last_name = last_name
            user.save()
        except User.DoesNotExist:
            # Create new user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            print(f"\n✓ Created new user: {username}")

    # Create or update profile with QA role
    profile, profile_created = Profile.objects.get_or_create(
        user=user,
        defaults={
            'role': 'qa',
            'coach_id': None,
        }
    )

    if not profile_created:
        profile.role = 'qa'
        profile.coach_id = None
        profile.save()
        print(f"  ✓ Updated profile for {username} (Role: QA)")
    else:
        print(f"  ✓ Created profile for {username} (Role: QA)")

    print(f"  Email: {email}")
    print(f"  Password: {password}")

print("\n" + "=" * 60)
print("Summary: All QA Accounts Created/Updated Successfully!")
print("=" * 60)
print("\nTotal QA accounts:")
qa_count = Profile.objects.filter(role='qa').count()
print(f"  {qa_count} QA accounts in database")
print("\nYou can now log in using either:")
print("  - Email address (e.g., Rewan.yasser@kentbusinesscollege.com)")
print("  - Username (e.g., Rewan.yasser)")
