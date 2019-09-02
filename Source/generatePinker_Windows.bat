ECHO OFF
SET filenamePinker=Pinker.js
SET filenameHead=000_public.js

COPY %filenameHead% %filenamePinker%

ECHO. >> %filenamePinker%
ECHO. >> %filenamePinker%
ECHO /*private scope*/ >> %filenamePinker%
ECHO (function() { >> %filenamePinker%
ECHO. >> %filenamePinker%

FOR /r %%A IN (*.js) DO (
	IF NOT %%~nxA==%filenamePinker% (
		IF NOT %%~nxA==%filenameHead% (
			TYPE %%A >> %filenamePinker%
		)
	)
)

ECHO. >> %filenamePinker%
ECHO })(); >> %filenamePinker%

MOVE /Y %filenamePinker% ..
