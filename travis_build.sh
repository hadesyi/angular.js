#!/bin/bash

set -e

ls -l bower_components/jquery/
echo ""
echo ""

if [[ -f bower_components/jquery/jquery.min.js ]]
then

  echo "Found the file. YAY"
else
  echo "File NOT FOUND"
  exit 1
fi
