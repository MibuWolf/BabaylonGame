/**
* @author confiner
* @desc 可调度事件的所有类的基类。
*/
var core;
(function (core) {
    class EventEmitter {
        /**
         * 检查 EvetEmitter 对象是否为特定事件类型注册了任何侦听器。
         * @param	type 事件的类型。
         * @return 如果指定类型的侦听器已注册，则值为 true；否则，值为 false。
         */
        hasListener(type) {
            let listener = this._eventList && this._eventList[type];
            return !!listener;
        }
        /**
         * 派发事件。
         * @param type	事件类型。
         * @param data	（可选）回调数据。<b>注意：</b>如果是需要传递多个参数 p1,p2,p3,...可以使用数组结构如：[p1,p2,p3,...] ；如果需要回调单个参数 p ，且 p 是一个数组，则需要使用结构如：[p]，其他的单个参数 p ，可以直接传入参数 p。
         * @return 此事件类型是否有侦听者，如果有侦听者则值为 true，否则值为 false。
         */
        event(type, data = null) {
            if (!this._eventList || !this._eventList[type])
                return false;
            let listeners = this._eventList[type];
            if (listeners.run) {
                if (listeners.once)
                    delete this._eventList[type];
                data != null ? listeners.runWith(data) : listeners.run();
            }
            else {
                for (let i = 0, n = listeners.length; i < n; i++) {
                    let listener = listeners[i];
                    if (listener) {
                        (data != null) ? listener.runWith(data) : listener.run();
                    }
                    if (!listener || listener.once) {
                        listeners.splice(i, 1);
                        i--;
                        n--;
                    }
                }
                if (listeners.length === 0 && this._eventList)
                    delete this._eventList[type];
            }
            return true;
        }
        /**
         * 使用 EventEmmiter 对象注册指定类型的事件侦听器对象，以使侦听器能够接收事件通知。
         * @param type		事件的类型。
         * @param caller	事件侦听函数的执行域。
         * @param listener	事件侦听函数。
         * @param args		（可选）事件侦听函数的回调参数。
         * @return 此 EvetEmitter 对象。
         */
        on(type, caller, listener, args = null) {
            return this._createListener(type, caller, listener, args, false);
        }
        /**
         * 使用 EventEmitter 对象注册指定类型的事件侦听器对象，以使侦听器能够接收事件通知，此侦听事件响应一次后自动移除。
         * @param type		事件的类型。
         * @param caller	事件侦听函数的执行域。
         * @param listener	事件侦听函数。
         * @param args		（可选）事件侦听函数的回调参数。
         * @return 此 EventEmitter 对象。
         */
        once(type, caller, listener, args = null) {
            return this._createListener(type, caller, listener, args, true);
        }
        /**@private */
        _createListener(type, caller, listener, args, once, offBefore = true) {
            //移除之前相同的监听
            offBefore && this.off(type, caller, listener, once);
            //使用对象池进行创建回收
            let handler = EventHandler.create(caller || this, listener, args, once);
            this._eventList || (this._eventList = {});
            let events = this._eventList;
            //默认单个，每个对象只有多个监听才用数组，节省一个数组的消耗
            if (!events[type])
                events[type] = handler;
            else {
                if (!events[type].run)
                    events[type].push(handler);
                else
                    events[type] = [events[type], handler];
            }
            return this;
        }
        /**
         * 从 EventEmitter 对象中删除侦听器。
         * @param type		事件的类型。
         * @param caller	事件侦听函数的执行域。
         * @param listener	事件侦听函数。
         * @param onceOnly	（可选）如果值为 true ,则只移除通过 once 方法添加的侦听器。
         * @return 此 EventEmitter 对象。
         */
        off(type, caller, listener, onceOnly = false) {
            if (!this._eventList || !this._eventList[type])
                return this;
            var listeners = this._eventList[type];
            if (listener != null) {
                if (listeners["run"]) {
                    if ((!caller || listeners["caller"] === caller) && listeners["method"] === listener && (!onceOnly || listeners["once"])) {
                        delete this._eventList[type];
                        listeners["recover"].apply(this);
                    }
                }
                else {
                    let count = 0;
                    let n = listeners["length"];
                    for (let i = 0; i < n; i++) {
                        var item = listeners[i];
                        if (item && (!caller || item.caller === caller) && item.method === listener && (!onceOnly || item.once)) {
                            count++;
                            listeners[i] = null;
                            item.recover();
                        }
                    }
                    //如果全部移除，则删除索引
                    if (count === n)
                        delete this._eventList[type];
                }
            }
            return this;
        }
        /**
         * 从 EventEmitter 对象中删除指定事件类型的所有侦听器。
         * @param type	（可选）事件类型，如果值为 null，则移除本对象所有类型的侦听器。
         * @return 此 EventEmitter 对象。
         */
        offAll(type = null) {
            let events = this._eventList;
            if (!events)
                return this;
            if (type) {
                this._recoverHandlers(events[type]);
                delete events[type];
            }
            else {
                for (let name in events) {
                    this._recoverHandlers(events[name]);
                }
                this._eventList = null;
            }
            return this;
        }
        _recoverHandlers(arr) {
            if (!arr)
                return;
            if (arr.run) {
                arr.recover();
            }
            else {
                for (let i = arr.length - 1; i > -1; i--) {
                    if (arr[i]) {
                        arr[i].recover();
                        arr[i] = null;
                    }
                }
            }
        }
    }
    core.EventEmitter = EventEmitter;
    class EventHandler extends Laya.Handler {
        EventHandler(caller, method, args, once) {
            this.setTo(caller, method, args, once);
        }
        recover() {
            if (this._id > 0) {
                this._id = 0;
                EventHandler._pool.push(this.clear());
            }
        }
        /**
         * 从对象池内创建一个Handler，默认会执行一次回收，如果不需要自动回收，设置once参数为false。
         * @param caller	执行域(this)。
         * @param method	回调方法。
         * @param args		（可选）携带的参数。
         * @param once		（可选）是否只执行一次，如果为true，回调后执行recover()进行回收，默认为true。
         * @return 返回创建的handler实例。
         */
        static create(caller, method, args = null, once = true) {
            if (EventHandler._pool.length)
                return EventHandler._pool.pop().setTo(caller, method, args, once);
            return new EventHandler(caller, method, args, once);
        }
    }
    /**@private handler对象池*/
    EventHandler._pool = [];
})(core || (core = {}));
//# sourceMappingURL=EventEmitter.js.map