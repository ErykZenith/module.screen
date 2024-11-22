local n = exports["module.screen"]
screen = setmetatable({}, {
    __index = function(self, index)
        self[index] = function(...)
            return n[index](...)
        end
        return self[index]
    end
})