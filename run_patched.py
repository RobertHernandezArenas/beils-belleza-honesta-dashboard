import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
concurrent.futures.ProcessPoolExecutor = ThreadPoolExecutor

import sys
import runpy
sys.argv = ['graphify', '.', '--code-only']
runpy.run_module('graphify', run_name='__main__')
