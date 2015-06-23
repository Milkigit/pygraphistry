#include "common.h"
#include "forceAtlas2/forceAtlas2Common.h"

__kernel void faIntegrate (
    //input
    __global float* globalSpeed,
    const __global float2* inputPositions,
    const __global float2* curForces,
    const __global float* swings,
    //output
    __global float2* outputPositions
) {

    const unsigned int n1Idx = (unsigned int) get_global_id(0);
    const unsigned int numPoints = (unsigned int) get_global_size(0);

    #define SPEED_CONSTANT 5.0f
    // TODO Fine tune there parameters for edge bundling.

    float sqrtPoints = sqrt((float)numPoints);
    // Set to 0.1f
    /*float speedFactor = max(SPEED_CONSTANT * sqrtPoints / 1000.0f, 0.1f);*/
    float speedFactor = 0.01f;
    // Set to 10
    //
    /*float maxSpeedFactor = max(SPEED_CONSTANT * sqrtPoints / 10.0f, 10.0f);*/
    float maxSpeedFactor = 1.0f;


    float2 delta;
    float swing = swings[n1Idx];
    float normalizedSwing = pow((swing  / (sqrtPoints) ), 2.0f);
    float speed = speedFactor * (*globalSpeed) / (1.0f + (*globalSpeed) * normalizedSwing);
    float maxSpeed = maxSpeedFactor / max(length(curForces[n1Idx]), FLT_EPSILON);


    delta = min(speed, maxSpeed) * curForces[n1Idx];
    /*delta = 0.001f * curForces[n1Idx];*/

    debug5("Speed (%d) %f max: %f, min %.9g \n", n1Idx, speed, maxSpeed, min(speed, maxSpeed));

    outputPositions[n1Idx] = inputPositions[n1Idx] + delta;
    return;
}
