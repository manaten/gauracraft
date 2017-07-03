export class EventRouter {
  constructor(doc_obj, target, listener) {
    this.doc_obj = doc_obj;
    this.target = target;
    this.listener = listener;

    this.dragging = false;
    this.drag_start = { x: 0, y: 0 };
    this.pointer_locked = false;

    this.target.onclick = ( e ) => {
      this.assign_handler();
    };

    this.set_onpointerlockchange_handler( (e) => {
      // 登録する側だったなら検出を気にしない
      if( this.doc_obj.pointerLockElement ) return;
      // 解除する側だったならイベントハンドラをすべて解除する
      this.unassign_handler();
    });
  }

  has_pointer_lock() {
    if(this.doc_obj.exitPointerLock) return true;
    if(this.doc_obj.webkitExitPointerLock) return true;
    if(this.doc_obj.mozExitPointerLock) return true;
    return false;
  }

  request_pointer_lock(){
    const funcs = [
      'requestPointerLock',
      'webkitRequestPointerLock',
      'mozRequestPointerLock'
    ];
    for(let i = 0; i < funcs.length; ++i) {
      // 関数があるかチェックしてあれば呼び出す
      if( this.target[funcs[i]] ) {
        this.target[funcs[i]]();
        return true;
      }
    }
    return false;
  }

  exit_pointer_lock() {
    const funcs = [
      'exitPointerLock',
      'webkitExitPointerLock',
      'mozExitPointerLock'
    ];
    for(let i = 0; i < funcs.length; ++i) {
      // 関数があるかチェックしてあれば呼び出す
      if( this.target[funcs[i]] ) {
        this.target[funcs[i]]();
        return true;
      }
    }
    return false;
  }

  set_onpointerlockchange_handler(handler) {
    const events = [
      'onpointerlockchange',
      'onmozpointerlockchange',
      'onwebkitpointerlockchange',
    ];
    for(let i = 0; i < events.length; ++i) {
      // とりあえず全部登録してしまう
      this.doc_obj[events[i]] = handler;
    }
  }

  assign_handler() {
    if( this.has_pointer_lock() ) {
      this.pointer_locked = this.request_pointer_lock();
    }

    this.target.onmousedown = ( e ) => {
      this.listener.onmousedown( );
      this.dragging = true;
      this.drag_start = { x: e.clientX, y: e.clientY };
      return false;
    };

    this.target.onmouseup = ( e ) => {
      this.listener.onmouseup( );
      this.dragging = false;
      return false;
    };

    this.target.onmousemove = ( e ) => {
      this.listener.onmousemove( e.movementX, e.movementY, this.dragging, this.drag_start );
      return false;
    };

    this.doc_obj.onkeydown = ( e ) => {
      this.listener.onkeydown( e.key );
      return false;
    };

    this.doc_obj.onkeyup = ( e ) => {
      this.listener.onkeyup( e.key );
      return false;
    };
  }

  unassign_handler() {
    this.exit_pointer_lock();

    this.target.onmousedown = () => { return false; };
    this.target.onmouseup = () => { return false; };
    this.target.onmousemove = () => { return false; };
    this.doc_obj.onkeydown = () => { return false; };
    this.doc_obj.onkeyup = () => { return false; };
  }
};
