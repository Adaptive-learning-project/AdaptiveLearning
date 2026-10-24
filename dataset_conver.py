import pandas as pd

# 1. Read the SPSS file directly
df = pd.read_spss("C:/Users/anany/Downloads/Merged Lab and Public Engagement Data (Pilot, Study 1, Study 3 & Study 4).sav")

# 2. Inspect available columns and first few rows
print(df.head())
print(df.info())

# 3. Export to clean CSV for your project
df.to_csv("ecitt_behavioral_data.csv", index=False)