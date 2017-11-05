export { TeonetCli, Teonet, onotherData } from './teocli.module';
export { TeonetClients } from './teocli.clients';

declare global {
    
    interface Array<T> {

        inArray(
            comparer:  (currentElement: T) => boolean, 
            exists_cb: (currentElement: T) => void 
        ): boolean;

        pushIfNotExist(
            element:   T, 
            comparer:  (currentElement: T) => boolean, 
            done_cb:   (currentElement: T) => void, 
            exists_cb: (currentElement: T) => void
        ): void;

        doIfNotExist(
            element:   T, 
            comparer:  (currentElement: T) => boolean, 
            do_cb:     (currentElement: T) => void
        ): void;
    }    
}

// check if an element exists in array using a comparer function
// comparer : function(currentElement)
if(!Array.prototype.inArray)
Array.prototype.inArray = function<T>(
    comparer:  (currentElement: T) => boolean, 
    exists_cb: (currentElement: T) => void ) {
    
    var retval = false;
    for(var i=0; i < this.length; i++) {
        if(comparer(this[i])) {
            if(typeof exists_cb === 'function') exists_cb(this[i]);
            retval = true;
        }
    }
    return retval;
};

// adds an element to the array if it does not already exist using a comparer
// function
if(!Array.prototype.pushIfNotExist)
Array.prototype.pushIfNotExist = function<T>(
    element:   T, 
    comparer:  (currentElement: T) => boolean, 
    done_cb:   (currentElement: T) => void, 
    exists_cb: (currentElement: T) => void) {
    
    //console.log("pushIfNotExist", element);
    if(!this.inArray(comparer, exists_cb)) {
        this.push(element);
        if(typeof done_cb === 'function')
            done_cb(element);
    }
};

if(!Array.prototype.doIfNotExist)
Array.prototype.doIfNotExist = function<T>(
    element:  T, 
    comparer: (currentElement: T) => boolean, 
    do_cb:    (currentElement: T) => void) {
    
    if(!this.inArray(comparer)) {
        if(typeof do_cb === 'function')
            do_cb(element);
    }
};
