(function(){
  this.FIRST_TILE = null; // Global position of the first tile (1a)
  this.TILE_SIZE = null; // Size of one tile
  this.whitesDeadPieces = null;
  this.blacksDeadPieces = null;
  
  this.wantDebug = false;
  this.active = false;
  
  this.entityID = null;
  this.properties = null;
  this.boardID = null;
  this.boardUserData = null;
  
  this.sound = null;
  this.startingTile = null;
  this.pieces = new Array();
  
  // All callbacks start by updating the properties
  this.updateProperties = function(entityID) {
    // Piece ID
    if (this.entityID === null || !this.entityID.isKnownID) {
      this.entityID = Entities.identifyEntity(entityID);
    }
    // Piece Properties
    this.properties = Entities.getEntityProperties(this.entityID);
    
    // Board ID
    if (this.boardID === null) {
      // Read user data string and update boardID
      var userData = JSON.parse(this.properties.userData);
      var boardID = Entities.identifyEntity(userData.boardID);
      if (boardID.isKnownID) {
        this.boardID = boardID;
      } else {
        return;
      }
    }
    
    // Board User Data
    this.updateUserData();
  }
  // Get an entity's user data
  this.getEntityUserData = function(entityID) {
    var properties = Entities.getEntityProperties(entityID);
    
    if (properties && properties.userData){
      return JSON.parse(properties.userData);
    } else {
      print("No user data found.");
      return null;
    }
  }
  // Updates user data related objects
  this.updateUserData = function() {
    // Get board's user data
    if (this.boardID !== null && this.boardID.isKnownID) {
      this.boardUserData = this.getEntityUserData(this.boardID);
      if (!(this.boardUserData &&
            this.boardUserData.firstTile &&
            this.boardUserData.tileSize &&
            this.boardUserData.whitesDeadPieces &&
            this.boardUserData.blacksDeadPieces)) {
        print("Incomplete boardUserData " + this.boardID.id);
      } else {
        this.FIRST_TILE = this.boardUserData.firstTile;
        this.TILE_SIZE = this.boardUserData.tileSize;
        this.whitesDeadPieces = this.boardUserData.whitesDeadPieces;
        this.blacksDeadPieces = this.boardUserData.blacksDeadPieces;
        
        this.active = true;
      }
    } else {
      print("Missing boardID:" + JSON.stringify(this.boardID));
    }
  }
  // Returns whether pos is inside the grid or not
  this.isOutsideGrid = function(pos) {
    return !(pos.i >= 0 && pos.j >= 0 && pos.i < 8 && pos.j < 8);
  }
  // Returns the tile coordinate
  this.getIndexPosition = function(position) {
    var halfTile = this.TILE_SIZE / 2.0;
    var corner = Vec3.sum(this.FIRST_TILE, { x: -halfTile, y: 0.0, z: -halfTile });
    var relative = Vec3.subtract(position, corner);
    return {
      i: Math.floor(relative.x / this.TILE_SIZE),
      j: Math.floor(relative.z / this.TILE_SIZE)
    }
  }
  // Returns the world position
  this.getAbsolutePosition = function(pos, halfHeight) {
    var relative = {
      x: pos.i * this.TILE_SIZE,
      y: halfHeight,
      z: pos.j * this.TILE_SIZE
    }
    return Vec3.sum(this.FIRST_TILE, relative);
  }
  // Pr, Vr are respectively the Ray's Point of origin and Vector director
  // Pp, Np are respectively the Plane's Point of origin and Normal vector
  this.rayPlaneIntersection = function(Pr, Vr, Pp, Np) {
    var d = -Vec3.dot(Pp, Np);
    var t = -(Vec3.dot(Pr, Np) + d) / Vec3.dot(Vr, Np);
    return Vec3.sum(Pr, Vec3.multiply(t, Vr));
  }
  // Download sound if needed
  this.maybeDownloadSound = function() {
    if (this.sound === null) {
      this.sound = SoundCache.getSound("http://public.highfidelity.io/sounds/Footsteps/FootstepW3Left-12db.wav");
    }
  }
  // Play drop sound
  this.playSound = function() {
    if (this.sound && this.sound.downloaded) {
  		Audio.playSound(this.sound, { position: this.properties.position });
    }
  }
  // updates the piece position based on mouse input
  this.updatePosition = function(mouseEvent) {
    var pickRay = Camera.computePickRay(mouseEvent.x, mouseEvent.y)
    var upVector = { x: 0, y: 1, z: 0 };
    var intersection = this.rayPlaneIntersection(pickRay.origin, pickRay.direction,
                                                 this.properties.position, upVector);                                 
    // if piece outside grid then send it back to the starting tile
    if (this.isOutsideGrid(this.getIndexPosition(intersection))) {
      intersection = this.getAbsolutePosition(this.startingTile, this.properties.dimensions.y / 2.0);
    }
    Entities.editEntity(this.entityID, { position: intersection });
  }
  // Snap piece to the center of the tile it is on
  this.snapToGrid = function() {
    var pos = this.getIndexPosition(this.properties.position);
    var finalPos = this.getAbsolutePosition((this.isOutsideGrid(pos)) ?  this.startingTile : pos,
                                            this.properties.dimensions.y / 2.0);
    Entities.editEntity(this.entityID, { position: finalPos });
  }
  this.moveDeadPiece = function() {
    return;
     var myPos = this.getIndexPosition(this.properties.position);
     for (var i = 0; i < this.pieces.length; i++) {
       if (this.pieces[i].id != this.entityID.id) {
         var piecePos = this.getIndexPosition(Entities.getEntityProperties(this.pieces[i]).position);
         if (myPos.i === piecePos.i && myPos.j === piecePos.j) {
           Entities.editEntity(this.pieces[i], { position: this.getAbsolutePosition({ i: 0, j: 0 })});
           break;
         }
       }
     }
  }

  
  this.grab = function(mouseEvent) {
    if (this.active) {
      this.startingTile = this.getIndexPosition(this.properties.position);
      this.updatePosition(mouseEvent);
    }
  }
  this.move = function(mouseEvent) {
    if (this.active) {
      this.updatePosition(mouseEvent);
    }
  }
  this.release = function(mouseEvent) {
    if (this.active) {
      this.updatePosition(mouseEvent);
      this.snapToGrid();
      //this.moveDeadPiece(); TODO
      this.playSound();
    }
  }
  
  this.preload = function(entityID) {
    this.updateProperties(entityID); // All callbacks start by updating the properties
    this.maybeDownloadSound();
  }
  this.clickDownOnEntity = function(entityID, mouseEvent) {
    this.preload(entityID); // TODO : remove
    this.updateProperties(entityID); // All callbacks start by updating the properties
    this.grab(mouseEvent);
  };
  this.holdingClickOnEntity = function(entityID, mouseEvent) {
    this.updateProperties(entityID); // All callbacks start by updating the properties
    this.move(mouseEvent);
  };
  this.clickReleaseOnEntity = function(entityID, mouseEvent) {
    this.updateProperties(entityID); // All callbacks start by updating the properties
    this.release(mouseEvent);
  };
})