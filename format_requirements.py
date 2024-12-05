# format_requirements.py
import re

def format_poetry_requirements(input_file, output_file):
    with open(input_file, 'r') as f:
        requirements = f.readlines()
    
    formatted = []
    for req in requirements:
        if req.strip() and not req.startswith('#'):
            package, version = req.strip().split('==')
            formatted.append(f"{package}=={version}  # https://github.com/{package}/{package}\n")
    
    with open(output_file, 'w') as f:
        f.write("".join(formatted))
