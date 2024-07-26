#!/usr/bin/env python3

from subprocess import run
from os.path import dirname, abspath

THIS_DIR = dirname(abspath(__file__))
RUN = lambda cmd, path=THIS_DIR : run(cmd, shell=True, cwd=path)

cmd = f'rsync -avvzP {THIS_DIR}/../../02_DEPLOY/* root@laxcat.com:/var/www/tylermartin.net/html/gfxtoy'
print(cmd)
RUN(cmd)
