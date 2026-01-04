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
    
    # Special handling for Doxy Visits - clean up the messy structure BEFORE header detection
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
    
    # Special handling for Gusto Hours - restructure from wide to proper format
    elif sheet_name == "Gusto Hours ":
        print("Applying special cleaning for Gusto Hours...")
        
        # In Gusto Hours, the structure is:
        # Week columns (like "12/14-12/20 ") contain provider names
        # Unnamed columns next to them contain the hours
        
        # Identify week columns and their corresponding data columns
        week_pairs = []
        for i, col in enumerate(df.columns):
            if '/' in str(col) and '-' in str(col) and 'unnamed' not in str(col).lower():
                # This is a week column, next unnamed column should have hours
                if i + 1 < len(df.columns) and 'unnamed' in str(df.columns[i + 1]).lower():
                    week_pairs.append((col, df.columns[i + 1]))
                    print(f"  Found week pair: {col} (provider) -> {df.columns[i + 1]} (hours)")
        
        if week_pairs:
            # Restructure: Create a proper table with Provider column and week columns
            # Collect all unique providers
            providers = set()
            for week_col, _ in week_pairs:
                providers.update(df[week_col].dropna().unique())
            
            # Remove "Provider" from the set if it exists
            providers = [p for p in providers if str(p).lower() not in ['provider', 'total', 'nan']]
            providers = sorted(providers)
            
            print(f"  Found {len(providers)} unique providers")
            
            # Build new dataframe
            new_data = []
            for provider in providers:
                row = {'Provider': provider}
                for week_col, hours_col in week_pairs:
                    # Find the row where this provider appears in this week
                    mask = df[week_col] == provider
                    if mask.any():
                        hours = df.loc[mask, hours_col].iloc[0]
                        if pd.notna(hours):
                            row[week_col.strip()] = hours
                new_data.append(row)
            
            df = pd.DataFrame(new_data)
            print(f"Restructured shape: {df.shape}")
            print(f"Restructured columns: {list(df.columns)}")
            print(f"Sample data:\n{df.head()}")
        
        print("\n" + "="*50 + "\n")
    
    # For sheets that weren't specially cleaned, check if first row contains headers
    if sheet_name not in ["Doxy Visits", "Gusto Hours "]:
        first_row = df.iloc[0] if len(df) > 0 else None
        if first_row is not None:
            # Check if first row looks like headers
            first_row_values = [str(v).lower() for v in first_row.values if pd.notna(v)]
            header_keywords = ['provider', 'number of visits', 'type of visit', 'visit type', 'program', 'total visits', 'hours']
            
            # If first row contains mostly header-like text, use it to rename columns
            if any(keyword in ' '.join(first_row_values) for keyword in header_keywords):
                print(f"  Detected header row in data for {sheet_name}")
                
                # Create new column names from first row
                new_columns = []
                for i, (col, val) in enumerate(zip(df.columns, first_row)):
                    if pd.notna(val) and str(val).strip() and str(val).strip().lower() not in ['nan']:
                        # Use the value from first row as column name
                        new_col = str(val).strip()
                        # If this column name already exists, keep original column name
                        if new_col in new_columns or len(new_col) > 50:
                            new_columns.append(col)
                        else:
                            new_columns.append(new_col)
                    else:
                        # Keep original column name
                        new_columns.append(col)
                
                df.columns = new_columns
                # Remove the header row from data
                df = df.iloc[1:].reset_index(drop=True)
                
                print(f"  Renamed columns: {list(df.columns)[:5]}... ({len(df.columns)} total)")
                print(f"  New shape after removing header row: {df.shape}")
                print()
    
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

