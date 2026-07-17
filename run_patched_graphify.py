import concurrent.futures
from concurrent.futures import ThreadPoolExecutor

# Patch ProcessPoolExecutor to use ThreadPoolExecutor to avoid Windows multiprocessing crashes
concurrent.futures.ProcessPoolExecutor = ThreadPoolExecutor

import sys
sys.argv = ['graphify', '.', '--code-only', '--force']
from graphify.cli import main
try:
    main()
except SystemExit:
    pass
