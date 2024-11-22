local ok = false
RegisterNUICallback("FrameOK", function(data, cb)
    ok = true
    cb("OK")
end)
while not ok do Wait(100) end

local EXPORTS = {
    {
        action = "takeScreenshot",
        pmt = { "target_color" }
    },
    {
        action = "startRecord",
    },
    {
        action = "stopRecord",
    }
}

for i = 1, #EXPORTS do
    local data = EXPORTS[i]
    print("^2export > ^0" .. data.action)

    exports(data.action, function(cb_path, ...)
        local r = {
            action = data.action,
            cb_path = cb_path,
        }

        local args = table.pack(...)
        local pmt = data.pmt

        if pmt then
            for j = 1, #args do
                if pmt[j] then
                    r[pmt[j]] = args[j]
                end
            end
        end

        SendNUIMessage(r)
    end)
end