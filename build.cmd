@ECHO OFF
@rmdir build /s /q
@node tools/r.js -o tools/build.js
@rmdir "build\app" /s /q
@rmdir "build\lib" /s /q
@rmdir "build\assets\css" /s /q
@del  "build\build.txt"
@ECHO --------- build done ----------