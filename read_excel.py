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
    
    # Special handling for Doxy Visits - clean up the messy structure
    if sheet_name == "Doxy Visits":
        print("Applying special cleaning for Doxy Visits...")
        
        # Keep only columns that are actually meaningful
        # Provider column and date-range columns (pattern: MM/DD-MM/DD or datetime)
        columns_to_keep = []
        seen_provider = False
        
        for col in df.columns:
            col_lower = str(col).lower()
            # Keep first provider column
            if 'provider' in col_lower and not seen_provider and 'unnamed' not in col_lower:
                columns_to_keep.append(col)
                seen_provider = True
            # Keep date columns (format like 11/30-12/6 or 12/21-12/28)
            elif '/' in str(col) and '-' in str(col) and 'unnamed' not in col_lower:
                columns_to_keep.append(col)
            # Keep datetime columns (they represent weeks)
            elif str(col).startswith('20') and ':' in str(col):
                # Rename datetime columns to a cleaner format
                try:
                    date_obj = pd.to_datetime(col)
                    new_col_name = f"Week of {date_obj.strftime('%m/%d')}"
                    df.rename(columns={col: new_col_name}, inplace=True)
                    columns_to_keep.append(new_col_name)
                except:
                    pass
        
        print(f"Initial columns to keep: {columns_to_keep}")
        df_temp = df[columns_to_keep].copy()
        
        # Filter out rows where Provider is actually a header or null
        df_temp = df_temp[
            (df_temp[columns_to_keep[0]].notna()) & 
            (~df_temp[columns_to_keep[0]].astype(str).str.lower().str.contains('provider|total', na=False))
        ]
        
        # Now check each data column to make sure it contains numeric data
        # Remove columns that have text in most rows (these are other side-by-side tables)
        final_columns = [columns_to_keep[0]]  # Always keep provider
        for col in columns_to_keep[1:]:
            # Count how many values are numeric
            numeric_count = pd.to_numeric(df_temp[col], errors='coerce').notna().sum()
            total_count = df_temp[col].notna().sum()
            # If more than 70% of values are numeric, keep the column
            if total_count > 0 and (numeric_count / total_count) > 0.7:
                final_columns.append(col)
                print(f"  [KEEP] {col}: {numeric_count}/{total_count} numeric values")
            else:
                print(f"  [SKIP] {col}: {numeric_count}/{total_count} numeric values (too much text data)")
        
        df = df_temp[final_columns]
        
        print(f"Cleaned shape: {df.shape}")
        print(f"Cleaned columns: {list(df.columns)}")
        print(f"Sample data:\n{df.head()}")
        print("\n" + "="*50 + "\n")
    
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

