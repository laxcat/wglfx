#version 300 es
precision highp float;
layout (location = 0) in vec4 aPosition;

void main() {
    gl_Position = aPosition;
}
