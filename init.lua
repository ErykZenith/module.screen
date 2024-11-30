local _export = exports["module.screen"]
module_screen = setmetatable({}, {
    __index = function(self, index)
        self[index] = function(...)
            return _export[index](...)
        end
        return self[index]
    end
})
