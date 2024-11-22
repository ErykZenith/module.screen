RegisterNUICallback("getTakeScreenshot", function(data, cb)
    print(data.url)
    cb("OK")
end)
RegisterNUICallback("getRecord", function(data, cb)
    print(data.url)
    cb("OK")
end)
RegisterNUICallback("getRecord1", function(data, cb)
    print(data.url)
    cb("OK")
end)
CreateThread(function()
    while true do
        DrawMarker(28, GetEntityCoords(PlayerPedId()), 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 5.0, 5.0, 5.0, 0, 255, 0, 255)
        Wait(0)
    end
end)
Wait(1000)

screen:takeScreenshot(
    "https://"..GetCurrentResourceName().."/getTakeScreenshot"
)
screen:takeScreenshot(
    "https://"..GetCurrentResourceName().."/getTakeScreenshot",
    {
        r=0,
        g=255,
        b=0
    }
)
screen:startRecord(
    "https://"..GetCurrentResourceName().."/getRecord"
)
screen:startRecord(
    "https://"..GetCurrentResourceName().."/getRecord1"
)
Wait(2000)
screen:stopRecord(
    "https://"..GetCurrentResourceName().."/getRecord"
)
Wait(2000)
screen:stopRecord(
    "https://"..GetCurrentResourceName().."/getRecord1"
)