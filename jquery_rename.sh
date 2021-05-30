
#!/bin/sh

UPLOAD="//ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"
LOCAL="../jquery-2.1.4.js"

if [ "$1" = "local" ]; then
    sed -i "s|${UPLOAD}|${LOCAL}|g" *.htm
    exit
fi

if [ "$1" = "upload" ]; then
    sed -i "s|${LOCAL}|${UPLOAD}|g" *.htm
    exit
fi

echo "$0 {local|upload}"
exit
