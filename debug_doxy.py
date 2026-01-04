import json

data = json.load(open('data.json'))
sheet = data.get('Doxy - Over 20 minutes', [])

print('Total rows:', len(sheet))
cols = list(sheet[0].keys()) if sheet else []
print('Columns:', cols)

print('\nFirst 3 rows:')
for i, row in enumerate(sheet[:3]):
    print(f'\nRow {i}:')
    print(f"  Unnamed: 0 = {row.get('Unnamed: 0')}")
    for col in cols:
        if 'week' in str(col).lower():
            print(f"  {col} = {row.get(col)}")

print('\nWeek columns:')
week_cols = [col for col in cols if 'week of' in str(col).lower()]
print(week_cols)

print('\nAnalyzing data - looking for visit numbers:')
if len(sheet) > 1:
    row1 = sheet[1]
    print(f"Row 1 provider: {row1.get('Unnamed: 0')}")
    for col in week_cols[:2]:
        print(f"  {col}: {row1.get(col)} (type: {type(row1.get(col))})")

