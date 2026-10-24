"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrismaClientClass = getPrismaClientClass;
const runtime = __importStar(require("@prisma/client/runtime/client"));
const config = {
    "previewFeatures": [],
    "clientVersion": "7.10.1",
    "engineVersion": "d1b3f377ca835d73fd50954a5e22128b9ebdd6b8",
    "activeProvider": "postgresql",
    "inlineSchema": "generator client {\n  provider = \"prisma-client\"\n  output   = \"../generated/prisma\"\n}\n\ndatasource db {\n  provider = \"postgresql\"\n}\n\nmodel User {\n  id        Int      @id @default(autoincrement())\n  fullname  String   @db.VarChar(100)\n  email     String   @unique @db.VarChar(150)\n  gender    String   @db.VarChar(20)\n  education String   @db.VarChar(100)\n  country   String   @db.VarChar(100)\n  password  String   @db.VarChar(255)\n  createdAt DateTime @default(now()) @map(\"created_at\") @db.Timestamp(0)\n\n  @@map(\"debate_users\")\n}\n",
    "runtimeDataModel": {
        "models": {},
        "enums": {},
        "types": {}
    },
    "parameterizationSchema": {
        "strings": [],
        "graph": ""
    }
};
config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"fullname\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"gender\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"education\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"country\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"password\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\",\"dbName\":\"created_at\"}],\"dbName\":\"debate_users\",\"schema\":null}},\"enums\":{},\"types\":{}}");
config.parameterizationSchema = {
    strings: JSON.parse("[\"where\",\"User.findUnique\",\"User.findUniqueOrThrow\",\"orderBy\",\"cursor\",\"User.findFirst\",\"User.findFirstOrThrow\",\"User.findMany\",\"data\",\"User.createOne\",\"User.createMany\",\"User.createManyAndReturn\",\"User.updateOne\",\"User.updateMany\",\"User.updateManyAndReturn\",\"create\",\"update\",\"User.upsertOne\",\"User.deleteOne\",\"User.deleteMany\",\"having\",\"_count\",\"_avg\",\"_sum\",\"_min\",\"_max\",\"User.groupBy\",\"User.aggregate\",\"AND\",\"OR\",\"NOT\",\"id\",\"fullname\",\"email\",\"gender\",\"education\",\"country\",\"password\",\"createdAt\",\"equals\",\"in\",\"notIn\",\"lt\",\"lte\",\"gt\",\"gte\",\"not\",\"contains\",\"startsWith\",\"endsWith\",\"set\",\"increment\",\"decrement\",\"multiply\",\"divide\"]"),
    graph: "MAsQCxwAACUAMB0AAAQAEB4AACUAMB8CAAAAASABACcAISEBAAAAASIBACcAISMBACcAISQBACcAISUBACcAISZAACgAIQEAAAABACABAAAAAQAgCxwAACUAMB0AAAQAEB4AACUAMB8CACYAISABACcAISEBACcAISIBACcAISMBACcAISQBACcAISUBACcAISZAACgAIQADAAAABAAgAwAABQAwBAAAAQAgAwAAAAQAIAMAAAUAMAQAAAEAIAMAAAAEACADAAAFADAEAAABACAIHwIAAAABIAEAAAABIQEAAAABIgEAAAABIwEAAAABJAEAAAABJQEAAAABJkAAAAABAQgAAAkAIAgfAgAAAAEgAQAAAAEhAQAAAAEiAQAAAAEjAQAAAAEkAQAAAAElAQAAAAEmQAAAAAEBCAAACwAwAQgAAAsAMAgfAgAwACEgAQAuACEhAQAuACEiAQAuACEjAQAuACEkAQAuACElAQAuACEmQAAvACECAAAAAQAgCAAADgAgCB8CADAAISABAC4AISEBAC4AISIBAC4AISMBAC4AISQBAC4AISUBAC4AISZAAC8AIQIAAAAEACAIAAAQACACAAAABAAgCAAAEAAgAwAAAAEAIA8AAAkAIBAAAA4AIAEAAAABACABAAAABAAgBRUAACkAIBYAACoAIBcAAC0AIBgAACwAIBkAACsAIAscAAAaADAdAAAXABAeAAAaADAfAgAbACEgAQAcACEhAQAcACEiAQAcACEjAQAcACEkAQAcACElAQAcACEmQAAdACEDAAAABAAgAwAAFgAwFAAAFwAgAwAAAAQAIAMAAAUAMAQAAAEAIAscAAAaADAdAAAXABAeAAAaADAfAgAbACEgAQAcACEhAQAcACEiAQAcACEjAQAcACEkAQAcACElAQAcACEmQAAdACENFQAAHwAgFgAAJAAgFwAAHwAgGAAAHwAgGQAAHwAgJwIAAAABKAIAAAAEKQIAAAAEKgIAAAABKwIAAAABLAIAAAABLQIAAAABLgIAIwAhDhUAAB8AIBgAACIAIBkAACIAICcBAAAAASgBAAAABCkBAAAABCoBAAAAASsBAAAAASwBAAAAAS0BAAAAAS4BACEAIS8BAAAAATABAAAAATEBAAAAAQsVAAAfACAYAAAgACAZAAAgACAnQAAAAAEoQAAAAAQpQAAAAAQqQAAAAAErQAAAAAEsQAAAAAEtQAAAAAEuQAAeACELFQAAHwAgGAAAIAAgGQAAIAAgJ0AAAAABKEAAAAAEKUAAAAAEKkAAAAABK0AAAAABLEAAAAABLUAAAAABLkAAHgAhCCcCAAAAASgCAAAABCkCAAAABCoCAAAAASsCAAAAASwCAAAAAS0CAAAAAS4CAB8AIQgnQAAAAAEoQAAAAAQpQAAAAAQqQAAAAAErQAAAAAEsQAAAAAEtQAAAAAEuQAAgACEOFQAAHwAgGAAAIgAgGQAAIgAgJwEAAAABKAEAAAAEKQEAAAAEKgEAAAABKwEAAAABLAEAAAABLQEAAAABLgEAIQAhLwEAAAABMAEAAAABMQEAAAABCycBAAAAASgBAAAABCkBAAAABCoBAAAAASsBAAAAASwBAAAAAS0BAAAAAS4BACIAIS8BAAAAATABAAAAATEBAAAAAQ0VAAAfACAWAAAkACAXAAAfACAYAAAfACAZAAAfACAnAgAAAAEoAgAAAAQpAgAAAAQqAgAAAAErAgAAAAEsAgAAAAEtAgAAAAEuAgAjACEIJwgAAAABKAgAAAAEKQgAAAAEKggAAAABKwgAAAABLAgAAAABLQgAAAABLggAJAAhCxwAACUAMB0AAAQAEB4AACUAMB8CACYAISABACcAISEBACcAISIBACcAISMBACcAISQBACcAISUBACcAISZAACgAIQgnAgAAAAEoAgAAAAQpAgAAAAQqAgAAAAErAgAAAAEsAgAAAAEtAgAAAAEuAgAfACELJwEAAAABKAEAAAAEKQEAAAAEKgEAAAABKwEAAAABLAEAAAABLQEAAAABLgEAIgAhLwEAAAABMAEAAAABMQEAAAABCCdAAAAAAShAAAAABClAAAAABCpAAAAAAStAAAAAASxAAAAAAS1AAAAAAS5AACAAIQAAAAAAATIBAAAAAQEyQAAAAAEFMgIAAAABMwIAAAABNAIAAAABNQIAAAABNgIAAAABAAAAAAUVAAYWAAcXAAgYAAkZAAoAAAAAAAUVAAYWAAcXAAgYAAkZAAoBAgECAwEFBgEGBwEHCAEJCgEKDAILDQMMDwENEQIOEgQREwESFAETFQIaGAUbGQs"
};
async function decodeBase64AsWasm(wasmBase64) {
    const { Buffer } = await Promise.resolve().then(() => __importStar(require('node:buffer')));
    const wasmArray = Buffer.from(wasmBase64, 'base64');
    return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
    getRuntime: async () => await Promise.resolve().then(() => __importStar(require("@prisma/client/runtime/query_compiler_fast_bg.postgresql.js"))),
    getQueryCompilerWasmModule: async () => {
        const { wasm } = await Promise.resolve().then(() => __importStar(require("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.js")));
        return await decodeBase64AsWasm(wasm);
    },
    importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
    return runtime.getPrismaClient(config);
}
//# sourceMappingURL=class.js.map