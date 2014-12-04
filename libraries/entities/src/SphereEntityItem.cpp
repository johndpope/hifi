//
//  SphereEntityItem.cpp
//  libraries/entities/src
//
//  Created by Brad Hefta-Gaub on 12/4/13.
//  Copyright 2013 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//


#include <QDebug>

#include <ByteCountCoding.h>

#include "EntityTree.h"
#include "EntityTreeElement.h"
#include "SphereEntityItem.h"


EntityItem* SphereEntityItem::factory(const EntityItemID& entityID, const EntityItemProperties& properties) {
    return new SphereEntityItem(entityID, properties);
}

// our non-pure virtual subclass for now...
SphereEntityItem::SphereEntityItem(const EntityItemID& entityItemID, const EntityItemProperties& properties) :
        EntityItem(entityItemID, properties) 
{ 
    _type = EntityTypes::Sphere;
    setProperties(properties, true);
}

EntityItemProperties SphereEntityItem::getProperties() const {
    EntityItemProperties properties = EntityItem::getProperties(); // get the properties from our base class
    properties.setColor(getXColor());
    return properties;
}

bool SphereEntityItem::setProperties(const EntityItemProperties& properties, bool forceCopy) {
    bool somethingChanged = EntityItem::setProperties(properties, forceCopy); // set the properties in our base class

    SET_ENTITY_PROPERTY_FROM_PROPERTIES(color, setColor);

    if (somethingChanged) {
        bool wantDebug = false;
        if (wantDebug) {
            uint64_t now = usecTimestampNow();
            int elapsed = now - getLastEdited();
            qDebug() << "SphereEntityItem::setProperties() AFTER update... edited AGO=" << elapsed <<
                    "now=" << now << " getLastEdited()=" << getLastEdited();
        }
        setLastEdited(properties.getLastEdited());
    }
    return somethingChanged;
}

int SphereEntityItem::readEntitySubclassDataFromBuffer(const unsigned char* data, int bytesLeftToRead, 
                                                ReadBitstreamToTreeParams& args,
                                                EntityPropertyFlags& propertyFlags, bool overwriteLocalData) {

    int bytesRead = 0;
    const unsigned char* dataAt = data;

    READ_ENTITY_PROPERTY_COLOR(PROP_COLOR, _color);

    return bytesRead;
}


// TODO: eventually only include properties changed since the params.lastViewFrustumSent time
EntityPropertyFlags SphereEntityItem::getEntityProperties(EncodeBitstreamParams& params) const {
    EntityPropertyFlags requestedProperties = EntityItem::getEntityProperties(params);
    requestedProperties += PROP_COLOR;
    return requestedProperties;
}

void SphereEntityItem::appendSubclassData(OctreePacketData* packetData, EncodeBitstreamParams& params, 
                                    EntityTreeElementExtraEncodeData* modelTreeElementExtraEncodeData,
                                    EntityPropertyFlags& requestedProperties,
                                    EntityPropertyFlags& propertyFlags,
                                    EntityPropertyFlags& propertiesDidntFit,
                                    int& propertyCount, 
                                    OctreeElement::AppendState& appendState) const { 

    bool successPropertyFits = true;
    APPEND_ENTITY_PROPERTY(PROP_COLOR, appendColor, getColor());
}

void SphereEntityItem::recalculateCollisionShape() {
    _sphereShape.setTranslation(getCenterInMeters());
    glm::vec3 dimensionsInMeters = getDimensionsInMeters();
    float largestDiameter = glm::max(dimensionsInMeters.x, dimensionsInMeters.y, dimensionsInMeters.z);
    _sphereShape.setRadius(largestDiameter / 2.0f);
}

bool SphereEntityItem::findDetailedRayIntersection(const glm::vec3& origin, const glm::vec3& direction,
                     bool& keepSearching, OctreeElement*& element, float& distance, BoxFace& face, 
                     void** intersectedObject) const {
                     
    // NOTE: origin and direction are in tree units. But our _sphereShape is in meters, so we need to
    // do a little math to make these match each other.
    RayIntersectionInfo rayInfo;
    rayInfo._rayStart = origin * (float)TREE_SCALE;
    rayInfo._rayDirection = direction;

    // TODO: Note this is really doing ray intersections against a sphere, which is fine except in cases
    // where our dimensions actually make us an ellipsoid. But we'll live with this for now until we
    // get a more full fledged physics library
    if (_sphereShape.findRayIntersection(rayInfo)) {
        distance = rayInfo._hitDistance / (float)TREE_SCALE;
        return true;
    }
    return false;                
}



