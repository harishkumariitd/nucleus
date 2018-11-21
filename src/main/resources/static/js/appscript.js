function getAppdata() {
    var appdata;
    var query = "";
    $.each(queryFields, function (key, value) {
        query = query + key + ":" + value + ","
    });
    query = query.substr(0, query.length - 1)

    var returnFields = "";
    primaryFields.forEach(field => {
        returnFields = returnFields + field.fieldname + ",";
    });
    returnFields = returnFields.substr(0, returnFields.length - 1)

    $.ajax({
        method: "GET",
        url: "/ui/appdata/get?client=" + client + "&entity=" + entity + "&queryFields=" + query + "&return_fields=" + returnFields,
        async: false,
        contentType: 'application/json; charset=UTF-8'
    }).success(function (data) {
        if (data) {
            appdata = data;
        }
    }).error(function (e) {
        notifyResponseError(e);
    });
    return appdata;
}

function getDocdata(id) {
    var query = "id" + ":" + id;
    var docData = null;
    $.ajax({
        method: "GET",
        url: "/ui/appdata/get?client=" + client + "&entity=" + entity + "&queryFields=" + query,
        async: false,
        contentType: 'application/json; charset=UTF-8'
    }).success(function (data) {
        if (data) {
            docData = data[0];
        }
    }).error(function (e) {
        notifyResponseError(e);
    });
    return docData;
}

function createAppData(doc) {
    var success = false;
    $.each(queryFields, function (key, value) {
        doc[key] = value;
    });
    $.ajax({
        method: "POST",
        url: clientBaseURL + "/entity/" + entity + "/create",
        async: false,
        data: JSON.stringify(doc),
        contentType: 'application/json; charset=UTF-8'
    }).success(function (data) {
        if (data) {
            loadDocDataAndDocList(data);
            success = true;
            notifySuccess("Created, Woo hoo!");
        }
    }).error(function (e) {
        notifyResponseError(e);
    });
    return success;
}

function addInAppData(fieldname, fieldvalue) {
    var updatesMap = new Object();
    updatesMap[fieldname.replace(/-/g, ".")] = [fieldvalue];
    return update("add_array", updatesMap);
}

function deleteInAppData(fieldname, fieldvalue, arraySize) {
    var updatesMap = new Object();
    updatesMap[fieldname.replace(/-/g, ".")] = [fieldvalue];
    return update("delete", updatesMap, arraySize);
}

function updateAppData(fieldname, fieldvalue) {
    var updatesMap = new Object();
    updatesMap[fieldname.replace(/-/g, ".")] = fieldvalue;
    return update("update", updatesMap);
}

function update(type, updatesMap, arraySize) {
    var dataObject = new Object();
    dataObject["ids"] = [appDataJsonObj.id];
    dataObject["updates"] = updatesMap;
    if (arraySize) {
        dataObject["array_size"] = arraySize;
    }
    return ajaxCall(clientBaseURL + "/entity/" + entity, type, dataObject);
}

function updatePrimary(updatesMap) {
    var dataObject = new Object();
    dataObject["id"] = appDataJsonObj.id;
    dataObject["updates"] = updatesMap;
    $.each(queryFields, function (key, value) {
        updatesMap[key] = value;
    });
    return ajaxCall(clientBaseURL + "/entity/" + entity, "primary", dataObject);
}

function upload(fullFieldName, file) {
    var formdata = new FormData();
    formdata.append("file", file[0]);
    formdata.append("ids", appDataJsonObj.id);
    formdata.append("fieldname", fullFieldName.replace(/-/g, "."));

    var success = false;
    $.ajax({
        type: "POST",
        enctype: 'multipart/form-data',
        url: clientBaseURL + "/entity/" + entity + "/upload",
        data: formdata,
        async: false,
        processData: false,
        contentType: false,
        cache: false,
        timeout: 600000,
        success: function (data) {
            if (data) {
                success = true;
                notifySuccess("Uploaded, Woo hoo!");
                showImage(fullFieldName, data);
            }
        },
        error: function (e) {
            notifyResponseError(e);
        }
    });
    return success;
}

function assignBackground(div, index) {
    if (index % 2 == 0) {
        div.attr("style", "border-top:1px solid rgb(212, 212, 212); background-color:rgb(236, 236, 236); padding:10px");
    } else {
        div.attr("style", "border-top:1px solid rgb(212, 212, 212); background-color:rgb(246, 246, 246); padding:10px");
    }
}

var number = ["integer",]
function cast(fullFieldName, fieldValue, fieldtype, subtype) {
    fieldtype = fieldtype.trim();
    fieldValue = fieldValue.trim();
    if (fieldtype == "integer" || fieldtype == "long") {
        return parseInt(fieldValue);
    } else if (fieldtype == "float" || fieldtype == "double") {
        return parseFloat(fieldValue);
    } else if (fieldtype == "boolean") {
        return "true" == fieldValue.toLowerCase();
    } else if (fieldtype == "date") {
        return $("#" + fullFieldName).children("input").datetimepicker("getDate").getTime();
    } else if (subtype == "many_to_many") {
        return fieldValue.replace(/ /g, "").split(",");
    }
    return fieldValue;
}

function assignEdit(div, elem) {
    var inputRef = $(".input");
    var edit = $(".edit").children(".edit").clone().show();
    var save = $(".edit").children(".save").clone().hide();
    var info = $(".edit").children(".info").clone().show();
    var fieldtype = div.children(".fieldtype").text().trim();

    div.append(edit).append(save).append(info);
    edit.click(function () {
        edit.hide();
        save.show();
        if (fieldtype == "date") {
            var input = div.children("input");
            input.datetimepicker("option", "disabled", false);
            input.datetimepicker("show");
        } else {
            elem.removeAttr("readonly");
            elem.removeAttr("disabled");
            elem.focus();
        }
    });
    save.click(function () {
        var fullFieldName = div.attr("id");
        var fieldValue = elem.val();
        if (!fieldtype || fieldtype == "") {
            fieldtype = div.parent().children(".subtype").text().trim();
        }
        var subtype = div.children(".subtype").text().trim();
        fieldValue = cast(fullFieldName, fieldValue, fieldtype, subtype);
        if(!fieldValue || fieldValue == NaN){
            notifyError("wrong input");
            return false;
        }
        // call update API
        var response = false;
        if (fieldtype == "file") {
            var file = div.children("input")[0].files;
            response = upload(fullFieldName, file);
        } else {
            response = updateAppData(fullFieldName, fieldValue);
        }
        if (response) {
            save.hide();
            edit.show();
            if (elem[0].nodeName == "SELECT" || elem.attr("type") == "file") {
                elem.attr("disabled", "disabled");
            } else {
                elem.attr("readonly", "readonly");
            }
            if (fieldtype == "date") {
                div.children("input").datetimepicker("option", "disabled", true);
            }
        }
    });
    info.click(function () {
        // TODO: creater and modifier details + create/update date
        notifyIncomplete($(this));
    });
}

function assignToggle(div, inputRef) {
    var expand;
    if (div.children(".expand").size() == 0) {
        expand = inputRef.children("span").clone().append("+").addClass("expand");
        expand.attr("title", "Expand All");
        expand.attr("style", expand.attr("style") + ";float:right; cursor:pointer; text-align:right;");
        $(div.children("div")[0]).before(expand);
    } else {
        expand = div.children(".expand");
    }
    expand.unbind('click');
    expand.click(function () {
        var text = $(this).text();
        if (text == "+") {
            div.find(".field").slideDown(200);
            $(this).text("−");
        } else {
            div.find(".field").slideUp(200);
            $(this).text("+");
        }
    });

    var span = div.children("span:not(.expand)");
    span.css("cursor", "pointer");
    span.unbind('click');
    span.click(function () {
        var content = div.children(".field:visible");
        if (content.size() == 0) {
            div.children(".field").slideDown(200);
        } else {
            div.find(".field").slideUp(200);
            expand.text("+");
        }
    });
    div.children(".field").hide();
}

function assignArrayElementRemove(removeSpan, arrayEntry) {
    removeSpan.click(function () {
        // call array element remove API
        var serial = parseInt($(this).siblings(".serial").text());
        var fieldname = $(this).parent().parent().attr("id");
        var value = new Object();
        value["serial"] = serial;
        var childs = $(this).parent().parent().children(".field");
        var arraySize = parseInt(childs.last().children(".serial").text().trim());
        var response = deleteInAppData(fieldname, value, arraySize);
        if (response) {
            shiftArrayElementsSerial(childs, serial);
            arrayEntry.remove();
        }
    });
}

function shiftArrayElementsSerial(childs, removedSerial) {
    // update ui
    childs.each(function (index, elem) {
        var serial = parseInt($(elem).children(".serial").text().trim());
        if (serial > removedSerial) {
            var newSerial = serial - 1;
            $(elem).children(".serial").text(newSerial);
            var id = $(elem).attr("id");
            var newId = id.replace("-" + serial, "-" + newSerial);
            $(elem).attr("id", newId);
        }
    });
}

var primaryTypes = ["string", "float", "double", "integer", "long"];
function populateInput(i, div, inputRef, fieldId, fieldtype, subtype, enumValues, subFields) {
    var input;
    if (primaryTypes.indexOf(fieldtype) >= 0) {
        input = inputRef.children("input").clone();
    } else if (fieldtype == "date") {
        input = inputRef.children("input").clone();
        input.datetimepicker({
            controlType: 'select',
            oneLine: true,
            timeFormat: 'hh:mm tt'
        });
        input.datetimepicker("option", "disabled", true);
    } else if (fieldtype == "file") {
        input = inputRef.children("input").clone();
        input.attr("type", "file").attr("disabled", "true");
    } else if (fieldtype == "boolean") {
        input = inputRef.children(".boolean").clone().removeClass("boolean");
    } else if (fieldtype == "enum") {
        input = inputRef.children(".select").clone().removeClass("select");
        var optionRef = input.children('option');
        enumValues.forEach(element => {
            var option = optionRef.clone().val(element).text(element);
            input.append(option);
        });
    } else if (fieldtype == "array") {
        div.addClass("array");
        var addButton = $(".edit").children(".add").clone().show();
        div.append(addButton);
        assignToggle(div, inputRef);
        addButton.click(function () {
            var serial = div.children().last().children(".serial").text();
            if (serial == "" || serial == NaN) {
                serial = 0;
            }
            serial = parseInt(serial) + 1;

            // call array add API and add just serial in the DB
            if (addApiEnabled == true) {
                var addElem = new Object();
                addElem["serial"] = serial;
                var success = addInAppData(fieldId, addElem);
                if (!success) {
                    return false;
                }
            }

            var newArrayEntry = $(".empty").clone().removeClass("empty").addClass("field").show();
            var serialSpan = inputRef.children("span").clone().append(serial);
            serialSpan.addClass("serial");
            serialSpan.attr("style", "display:inline-block; width:200px; font-size:10; cursor:pointer");
            newArrayEntry.append(serialSpan);

            var removeSpan = inputRef.children("span").clone().append("x");
            removeSpan.addClass("remove");
            removeSpan.attr("style", "display:inline-block; margin-left:400px; width: 40px; text-align: center; font-size:10; cursor:pointer");

            var newFieldId = fieldId + "-" + serial;
            newArrayEntry.attr("id", newFieldId);
            if (subtype == "object" || typeDefMap.hasOwnProperty(subtype) || entityMap.hasOwnProperty(subtype)) {
                populateFields(subFields, newArrayEntry, newFieldId, i + 1, false);
                serialSpan.after(removeSpan);
                serialSpan.click(function () {
                    var display = newArrayEntry.children(".field").css("display")
                    if (display == "none") {
                        newArrayEntry.children(".field").slideDown(200);
                    } else {
                        newArrayEntry.find(".field").slideUp(200);
                    }
                });
            } else {
                var entryInput = populateInput(i + 1, newArrayEntry, inputRef, newFieldId, subtype, null, enumValues, subFields);
                newArrayEntry.attr("id", newFieldId + "-" + "value"); // for non object array elements
                newArrayEntry.append(entryInput);
                assignEdit(newArrayEntry, entryInput);
                newArrayEntry.append(removeSpan);
                serialSpan.css("width", "170px");
                removeSpan.css("margin-left", "175px");
                serialSpan.css("cursor", "");
                assignBackground(newArrayEntry, i);
            }
            div.append(newArrayEntry);
            assignArrayElementRemove(removeSpan, newArrayEntry);

            assignToggle(div, inputRef);
            div.children(".field").show();

            // for scrolling to the added array element
            if (addApiEnabled == true && newArrayEntry.is(':visible')) {
                $(".docdata").animate({ scrollTop: (newArrayEntry.offset().top - $(".navigator").height() + $(".docdata").scrollTop()) }, "slow");
            }
        });
    } else if (fieldtype == "object") {
        if (subFields) {
            populateFields(subFields, div, fieldId, i + 1, false);
            assignToggle(div, inputRef);
        }
    } else if (typeDefMap.hasOwnProperty(fieldtype)) {
        var type = typeDefMap[fieldtype];
        var subFields = type.fields;
        if (subFields) {
            populateFields(subFields, div, fieldId, i + 1, false);
            assignToggle(div, inputRef);
        }
    } else if (entityMap.hasOwnProperty(fieldtype)) {
        // TODO: if entity association is supported
        input = inputRef.children("input").clone();
    }
    return input;
}

function populateFields(fields, parentDiv, parentId, index, allowOnlyPrimary) {
    var i = 0;
    if (index) {
        i = index;
    }
    fields.forEach(function (field) {
        var allow = false;
        var isPrimaryField = (field.fieldlevel == "primary");
        if (allowOnlyPrimary == isPrimaryField) { // xnor gate
            allow = true;
        }

        if (allow) {
            var fieldname = field.fieldname;
            var displayname = field.displayname;
            var fieldtype = field.type;
            var subtype = field.subtype;
            var div = $(".empty").clone().removeClass("empty").addClass("field");
            var inputRef = $(".input");
            var required = " ";
            if (field.required == true) {
                required = "<label style='padding-left:2px; color:red'>*<label>";
            }
            div.append(inputRef.children("span").clone().append(displayname + required));
            div.append(inputRef.children("span").clone().append(fieldtype + " ").addClass("fieldtype"));
            if (subtype) {
                div.append(inputRef.children("span").clone().append(subtype + " ").addClass("subtype"));
            }

            var fieldId = fieldname;
            if (parentId) {
                fieldId = parentId + "-" + fieldname;
            }
            div.attr("id", fieldId);

            // populating field div
            var input;
            if (isPrimaryField == true) {
                input = populateInput(i, div, inputRef, fieldId, fieldtype, null, field.values, null)
            } else {
                input = populateInput(i, div, inputRef, fieldId, fieldtype, subtype, field.values, field.fields)
            }

            if (input) {
                div.append(input);
                if (isPrimaryField == false) {
                    assignEdit(div, input);
                }
            }
            assignBackground(div, i);
            div.show();
            parentDiv.append(div);
            i = i + 1;
        }
    });
}

function populateAppData(appdataJson, parentFieldName) {
    if (!parentFieldName) {
        removeAllArrayElements();
        removeAllImages();
    }
    $.each(appdataJson, function (key, value) {
        if (key == "serial") {
            return true;
        }
        var fullFieldName = key;
        if (parentFieldName && parentFieldName != "") {
            fullFieldName = parentFieldName + "-" + key;
        }
        var fieldtype = $("#" + fullFieldName).children(".fieldtype").text().trim();
        if (!fieldtype || fieldtype == "") {
            fieldtype = $("#" + fullFieldName).parent().children(".subtype").text().trim();
        }

        if (value instanceof Array) {
            $("#" + fullFieldName).children(".field").remove();
            value.forEach(val => {
                var serial = val["serial"];
                var fieldId = fullFieldName + "-" + serial;

                //Create array element
                $("#" + fullFieldName + " .add").click();

                //Assign element value
                populateAppData(val, fieldId);
                $("#" + fieldId).children(".serial").click();
            });
        } else if (value instanceof Object) {
            populateAppData(value, fullFieldName);
        } else if (fieldtype == "file") {
            showImage(fullFieldName, value);
        } else if (fieldtype == "date") {
            $("#" + fullFieldName).children("input").datetimepicker("setDate", new Date(value));
        } else {
            $("#" + fullFieldName).children("select,input").val(value);
        }
    });
}

function showImage(fullFieldName, url) {
    $("#" + fullFieldName).children(".url").remove();

    var span = $(".edit .edit").clone().removeClass("edit").addClass("url").attr("title", "");
    var img = span.children("img").hide();
    img.attr("src", url).css("position", "absolute").css("width", "200px");
    span.hover(function () { img.show(); }, function () { img.hide(); });

    var innerspan = span.clone().append(url);
    innerspan.children("img").remove();
    innerspan.attr("style", "text-overflow:ellipsis; overflow-x:hidden; width:200px; white-space:nowrap; display:inline-block;");
    span.append(innerspan).css("position", "relative");

    $("#" + fullFieldName).append(span.show());
}

function removeAllImages() {
    $(".url").remove();
}

function removeAllArrayElements() {
    $(".array").children(".field").remove();
}

function populatePrimaryFields(fields, mainDiv) {
    var primaryDiv = $("div.empty").clone().removeClass("empty").addClass("primary");
    mainDiv.append(primaryDiv);
    populateFields(fields, primaryDiv, null, null, true)

    // assign edit buttons
    var edit = $(".edit").children(".edit").clone().show();
    var save = $(".edit").children(".save").clone().hide();
    var info = $(".edit").children(".info").clone().show();

    var div = primaryDiv.children(".field:last-child");
    div.append(edit).append(save).append(info);
    edit.click(function () {
        edit.hide();
        save.show();
        $.each(primaryDiv.children(".field").toArray().reverse(), function (index, fieldElem) {
            var field = $(fieldElem);
            var fieldtype = field.children(".fieldtype").text().trim();
            var input = field.children("input, select");
            if (fieldtype == "date") {
                input.datetimepicker("option", "disabled", false);
                input.datetimepicker("show");
            } else {
                input.removeAttr("readonly");
                input.removeAttr("disabled");
                input.focus();
            }
        });
    });
    save.click(function () {
        var fields = primaryDiv.children(".field");
        var updates = new Object();
        var errorFlag = false;
        $.each(fields, function (index, fieldElem) {
            var field = $(fieldElem);
            var fieldtype = field.children(".fieldtype").text().trim();
            var input = field.children("input, select");
            var fullFieldName = field.attr("id");
            var fieldValue = input.val();
            fieldValue = cast(fullFieldName, fieldValue, fieldtype, null);
            if(!fieldValue || fieldValue == NaN){
                errorFlag = true;
                return false;
            }
            updates[fullFieldName] = fieldValue;
        });
        if(errorFlag == true){
            notifyError("wrong input");
        }
        // call update API
        var response = updatePrimary(updates);
        if (response) {
            save.hide();
            edit.show();
            $.each(fields, function (index, fieldElem) {
                var field = $(fieldElem);
                var fieldtype = field.children(".fieldtype").text().trim();
                var input = field.children("input, select");
                if (input[0].nodeName == "SELECT") {
                    input.attr("disabled", "disabled");
                } else {
                    input.attr("readonly", "readonly");
                }
                if (fieldtype == "date") {
                    input.datetimepicker("option", "disabled", true);
                }
            });
        }
    });
    info.click(function () {
        // TODO: creater and modifier details + create/update date
        notifyIncomplete($(this));
    });
}

var primaryFields = [];
function populateMetadata() {
    var mainDiv = $(".docdata").text("")
    mainDiv.append("<label>Primary Fields</label>");

    // populate primary fields
    populatePrimaryFields(entityMap[entity].fields, mainDiv);
    entityMap[entity].fields.forEach(field => {
        if (field.fieldlevel == "primary") {
            primaryFields.push(field);
        }
    });

    // populate create dialog fields
    var fieldset = dialog.find("fieldset");
    fieldset.children("input[type=text], select").remove();
    var labelRef = fieldset.children("label").remove()[0];
    var inputRef = $(".input");
    primaryFields.forEach(field => {
        var label = $(labelRef).clone().text(field.displayname);
        var input = populateInput(null, null, inputRef, null, field.type, null, field.values, null);
        input.removeAttr("style").removeAttr("readonly").removeAttr("disabled");
        input.attr("name", field.fieldname);
        input.attr("fieldtype", field.type);
        fieldset.append(label).append(input);
    });

    // populate other fields
    mainDiv.append("<label>Other Fields</label>");
    populateFields(entityMap[entity].fields, mainDiv, null, null, false);
    mainDiv.hide();
}

function loadEntitySelector(entityMap) {
    var div = $(".global_fields");
    var spanRef = $(".input span");
    var selectRef = $(".input .select");

    var select = selectRef.clone().removeClass("select");
    var optionRef = select.children("option").remove();
    $.each(entityMap, function (entityname, entity) {
        select.append(optionRef.clone().text(entity.displayname).val(entityname));
    });
    select.removeAttr("disabled");
    var span = spanRef.clone().append("<label>Entity</label>").append(select.show())
    div.append(span);
    select.selectmenu({
        change: function () {
            entity = $(this).val();

            // Populate metadata
            populateMetadata();

            // Populate doclist
            populateDoclist();
        }
    });
}

var queryFields;
function loadGlobalFields(globalFields) {
    queryFields = new Object();
    var div = $(".global_fields");
    var spanRef = $(".input span");
    var selectRef = $(".input .select");

    globalFields.forEach(field => {
        queryFields[field.fieldname] = field.values[0];
        var select = selectRef.clone().removeClass("select");
        var optionRef = select.children("option").remove();
        field.values.forEach(function (value) {
            select.append(optionRef.clone().text(value).val(value));
        });
        select.attr("name", field.fieldname);
        select.removeAttr("disabled");
        var span = spanRef.clone().append("<label>" + field.displayname + "</label>").append(select.show())
        div.append(span);
        select.selectmenu({
            change: function () {
                var fieldname = $(this).attr("name");
                var value = $(this).val();
                queryFields[fieldname] = value;
                // Populate doclist
                populateDoclist();
            }
        });
    });

    // set doc divs heights
    var height = "calc(100% - " + div.outerHeight() + "px)";
    $(".doclist").css("height", height);
    $(".docdata").css("height", height);

    // add create button
    // var button = $(".input button").clone().text("Create").attr("style", "height:21px; margin-left:3px;").show();
    // div.append(button);
    var button = $(".menubar .create");
    button.click(function () {
        dialog.dialog("open");
    });
}

function populateDoclist(appdata) {
    var mainDiv = $(".docdata");
    mainDiv.hide();
    var docListDiv = $(".doclist").text("");
    var divRef = docListDiv.clone().removeClass("doclist").removeAttr("style");
    docListDiv.append("<label>Documents</label>");

    if (!appdata) {
        appdata = getAppdata();
    }
    if (appdata && appdata.length > 0) {
        mainDiv.show();
        appdata.forEach(data => {
            var docDiv = appendToDocList(divRef, data, docListDiv);
            docListDiv.append(docDiv);
        });
        docListDiv.children("div").first().click();
    }
}

function appendToDocList(divRef, data, docListDiv){
    var docDiv = divRef.clone().addClass("doc");
    docDiv.attr("id", data["id"]);
    primaryFields.forEach(field => {
        var fieldDiv = divRef.clone();
        fieldDiv.append(field.displayname).append(" = ").append(data[field.fieldname]);
        docDiv.append(fieldDiv);
    });
    docDiv.click(function () {
        loadDocData(this.id);
        docListDiv.children().css("background-color", "");
        docDiv.css("background-color", "rgb(220, 220, 220);");
    });
    return docDiv;
}

var appDataJsonObj;
function loadDocData(id) {
    // reset/clean all values before populating again
    $("input:not(input[type=button]), select:not(.global_fields select, .navigator select)").val("");

    // get doc-data
    appDataJsonObj = getDocdata(id);

    // populate data
    addApiEnabled = false;
    populateAppData(appDataJsonObj);
    addApiEnabled = true;
    $(".docdata").show();
}

function loadDocDataAndDocList(id){
    // load docdata
    loadDocData(id);

    // update doclist
    var docListDiv = $(".doclist");
    var divRef = $(".empty").clone().removeClass("empty");
    var docDiv = appendToDocList(divRef, appDataJsonObj, docListDiv);
    docListDiv.children("label").after(docDiv);
    docListDiv.children().css("background-color", "");
    docDiv.css("background-color", "rgb(220, 220, 220);");
}

function addDocument() {
    var valid = true;
    allFields.removeClass("ui-state-error");

    var errorFlag = false;
    var doc = new Object();
    allFields = dialog.find("fieldset input[type=text], select");
    $.each(allFields, function(index, input) {
        input = $(input);
        var fieldname = input.attr("name");
        var fieldtype = input.attr("fieldtype");
        var value = input.val();
        value  = cast(fieldname, value, fieldtype, null);
        if(!value || value == NaN){
            errorFlag = true;
            input.addClass("ui-state-error");
            return false;
        }
        doc[fieldname] = value;
    });
    if(errorFlag == true){
        notifyError("Wrong data");
        valid = false;
    }
    if (valid) {
        var response = createAppData(doc);
        if(response == true){
            dialog.dialog("close");
        }
    }
    return valid;
}