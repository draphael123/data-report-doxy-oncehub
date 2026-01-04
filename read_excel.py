import pandas as pd
import json

# Read the Excel file
excel_file = r"Spreadsheets\Data Sources 1-4\Oncehub_Doxy Report (in use) (5).xlsx"
xls = pd.ExcelFile(excel_file)

print("Sheet names:", xls.sheet_names)
print("\n" + "="*50 + "\n")

# Read each sheet and display structure
sheets_data = {}
for sheet_name in xls.sheet_names:
    df = pd.read_excel(excel_file, sheet_name=sheet_name)
    print(f"Sheet: {sheet_name}")
    print(f"Shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nFirst few rows:")
    print(df.head())
    print("\n" + "="*50 + "\n")
    
    # Convert column names to strings (handle datetime columns)
    df.columns = [str(col) for col in df.columns]
    
    # Replace NaN, inf, -inf with None
    df = df.replace([float('inf'), float('-inf')], None)
    df = df.where(pd.notnull(df), None)
    
    sheets_data[sheet_name] = df.to_dict('records')

# Custom JSON encoder to handle any remaining edge cases
def clean_for_json(obj):
    if isinstance(obj, float):
        if pd.isna(obj) or obj != obj:  # NaN check
            return None
        if obj == float('inf') or obj == float('-inf'):
            return None
    return obj

# Clean all data
for sheet_name in sheets_data:
    for row in sheets_data[sheet_name]:
        for key in row:
            row[key] = clean_for_json(row[key])

# Save to JSON for the website
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(sheets_data, f, ensure_ascii=False, indent=2)

print("Data exported to data.json")

