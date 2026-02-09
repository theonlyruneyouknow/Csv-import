# EBMDB Module - MySQL Database Connection

This module helps connect to your local MySQL database to assist with fixing the missionary data import.

## Setup Instructions

### 1. Update .env File

Open `.env` and update these lines with your MySQL credentials:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root                    # Your MySQL username
MYSQL_PASSWORD=your_password_here  # Your MySQL password
MYSQL_DATABASE=ebm                 # Your database name
```

### 2. Run the Diagnostic

Once you've updated the credentials, run:

```bash
node ebmdb-diagnostic.js
```

This will:
- Connect to your MySQL database
- List all tables
- Show table structures (columns, types, keys)
- Display sample data from each table
- Generate recommended export queries

## What to Look For

The diagnostic will help you identify:

1. **Alumni/Missionary Table** - The main missionaries data
2. **Areas Table** - Mission areas with a_id and area_id
3. **Alumni_Areas Table** - Relationships between missionaries and areas
4. **Companionships Table** - Companion pairs/groups

## Next Steps

After running the diagnostic, we can:

1. **Export to CSV** - Use the generated queries to export data
2. **Direct Import** - Create functions to import directly from MySQL → MongoDB
3. **Data Validation** - Compare MySQL data vs current MongoDB data

## Troubleshooting

If you get connection errors:

1. Make sure MySQL server is running
2. Verify your credentials in `.env`
3. Check that the database name exists
4. Ensure MySQL is accessible on localhost:3306

Common MySQL commands to check:
```bash
# Check if MySQL is running (PowerShell)
Get-Service MySQL*

# Start MySQL if needed
Start-Service MySQL80
```
