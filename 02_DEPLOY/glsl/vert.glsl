#version 300 es
precision highp float;
layout (location = 0) in vec4 aPosition;
layout (location = 1) in vec4 aColor;

uniform Block {
    vec4 time;
};

out vec4 vColor;

void main() {
    gl_Position = aPosition + time;
    vColor = aColor;
}
