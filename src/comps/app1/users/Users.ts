import {Component, ElementRef, ViewChild} from "@angular/core";
import {IsimplelistItem, simplelist} from "../../simplelist/simplelist";
import {AppStore} from "angular2-redux-util";
import {BusinessAction} from "../../../business/BusinessAction";
import {ModalComponent} from "ng2-bs3-modal/components/modal";
import {BusinessModel} from "../../../business/BusinessModel";
import {UsersDetails} from "./UsersDetails";
import {BusinessUser} from "../../../business/BusinessUser";
import {List} from "immutable";
import {PrivelegesModel} from "../../../reseller/PrivelegesModel";
import {SampleModel} from "../../../business/SampleModel";
import {animate, state, style, transition, trigger} from "@angular/animations";
import * as _ from "lodash";
import {Compbaser} from "ng-mslib";
import {Lib} from "../../../Lib";

@Component({
    selector: 'Users',
    styleUrls: ['./Users.css'],
    templateUrl: './Users.html',
    host: {
        '[@routeAnimation]': 'true',
        '[style.display]': "'block'"
    },
    animations: [
        trigger('routeAnimation', [
            state('*', style({opacity: 1})),
            transition('void => *', [
                style({opacity: 0}),
                animate(333)
            ]),
            transition('* => void', animate(333, style({opacity: 0})))
        ])
    ]
})

// for slide animation use:
// animations: [
//     trigger('routeAnimation', [
//         state('*', style({transform: 'translateX(0)', opacity: 1})),
//         transition('void => *', [
//             style({transform: 'translateX(-100%)', opacity: 0}),
//             animate(1000)
//         ]),
//         transition('* => void', animate(333, style({transform: 'translateX(100%)', opacity: 0})))
//     ])
// ]
// styleUrls: ['../comps/app1/users/Users.css'],
// templateUrl: '/src/comps/app1/users/Users.html'
// moduleId: __moduleName,
// styleUrls: ['Users.css'],
// templateUrl: 'Users.html',

export class Users extends Compbaser {
    inDevMode;
    selectedAddUser = 'Add user action';

    constructor(private appStore: AppStore, private businessAction: BusinessAction) {
        super();
        this.inDevMode = Lib.DevMode();
        var i_businesses = this.appStore.getState().business;
        var i_reseller = this.appStore.getState().reseller;
        this.businessesList = i_businesses.getIn(['businesses']);
        this.unsub = this.appStore.sub((i_businesses: List<BusinessModel>) => {
            this.businessesList = i_businesses;
        }, 'business.businesses');

        this.samples = i_businesses.getIn(['samples']);
        this.unsub = this.appStore.sub((i_samples: List<SampleModel>) => {
            this.samples = i_samples;
        }, 'business.samples');

        this.businessesUsers = i_businesses.getIn(['businessUsers']);
        this.unsub2 = this.appStore.sub((businessUsers: List<BusinessUser>) => {
            this.businessesUsers = businessUsers;
            this.onFilteredSelection();
        }, 'business.businessUsers');

        this.priveleges = i_reseller.getIn(['privileges']);
        this.unsub3 = this.appStore.sub((privelegesModel: List<PrivelegesModel>) => {
            this.priveleges = privelegesModel;
        }, 'reseller.privileges');
    }

    @ViewChild('simplelist')
    simplelist: simplelist;

    @ViewChild('modalSamples')
    modalSamples: ModalComponent;

    @ViewChild('modalAddUserClean')
    modalAddUserClean: ModalComponent;

    @ViewChild('modalAddUserSamples')
    modalAddUserSamples: ModalComponent;

    @ViewChild('importUserName')
    importUserName: ElementRef;

    @ViewChild('importUserPass')
    importUserPass: ElementRef;

    @ViewChild('modalAddUserExisting')
    modalAddUserExisting: ModalComponent;

    @ViewChild(UsersDetails)
    usersDetails: UsersDetails;

    businessesList: List<BusinessModel> = List<BusinessModel>();
    samples: List<SampleModel> = List<SampleModel>();
    businessesListFiltered: List<BusinessModel>
    businessUsersListFiltered: List<BusinessUser>;
    businessesUsers: List<BusinessUser>
    priveleges: List<PrivelegesModel>
    showUserInfo: Object = null;
    selectedSampleBusinessId: number = -1;
    unsub: Function;
    unsub2: Function;
    unsub3: Function;
    accounts = ['Add new account from sample', 'Add new account from blank', 'Import existing account'];

    onAddUserDropDown(event) {
        this.onAddUser(event.target.value)
    }

    onAddUser(choice, fromSample: boolean = false) {
        this.selectedAddUser = 'Add user action';
        switch (choice) {
            case this.accounts[0]: {
                this.modalSamples.open('lg');
                break;
            }
            case this.accounts[1]: {
                // if (fromSample == false && this.getSelectedBusinessId() == -1)
                //     return bootbox.alert('you must first select a business from the list, to create the new account under...');
                // if (fromSample == false && this.getSelectedBusinessId() > 0)
                //     return this.modalAddUserClean.open('lg');
                if (fromSample) {
                    return this.modalAddUserSamples.open('lg');
                } else {
                    return this.modalAddUserClean.open('lg');
                }
            }
            case this.accounts[2]: {
                this.modalAddUserExisting.open('lg');
                break;
            }
        }
    }

    onRemoveUser(event) {
        if (!this.businessesListFiltered || this.businessesListFiltered.size != 1)
            return
        var businessModel: BusinessModel = this.businessesListFiltered.first();
        let businessId = businessModel.getBusinessId();

        bootbox.prompt({
            title: "are you sure you want to delete this account, this operation cannot be undone! type your enterprise account password to confirm deletion!",
            inputType: "password",
            buttons: {
                confirm: {
                    className: "btn-danger",
                    label: "Delete"
                },
                cancel: {}
            },
            callback: (result) => {
                if (_.isNull(result))
                    return;
                var password = this.appStore.getState().appdb.get('credentials').get('pass');
                if (result == password) {
                    this.appStore.dispatch(this.businessAction.removeBusiness(businessId));
                    this.businessUsersListFiltered = null;
                    this.showUserInfo = null;
                } else {
                    bootbox.alert('enterprise password did not match so account remains');
                }
            }
        });
    }

    onSelectedsample(businessId) {
        this.selectedSampleBusinessId = businessId;
        this.modalSamples.close();
        this.onAddUser(this.accounts[1], true);
    }

    onModalClose($event) {
    }

    onImportUser(event) {
        var user = this.importUserName.nativeElement.value;
        var pass = this.importUserPass.nativeElement.value;
        if (user.length < 2 || pass.length < 2) {
            bootbox.alert('user or password entered are too short');
            return;
        }
        this.appStore.dispatch(this.businessAction.associateUser(user, pass));
        this.modalAddUserExisting.close();
    }

    getSelectedBusinessId(): number {
        if (!this.businessUsersListFiltered)
            return -1;
        var first = this.businessesListFiltered.first();
        if (_.isUndefined(first))
            return -1;
        return first.getBusinessId();
    }

    getSelectedSampleBusinessId(): number {
        return this.selectedSampleBusinessId;
    }

    onShowUserInfo(selectedBusiness: IsimplelistItem) {
        this.onFilteredSelection();
        this.showUserInfo = selectedBusiness;
    }

    onFilteredSelection() {
        this.showUserInfo = null;
        if (!this.simplelist)
            return;
        var businessSelected = this.simplelist.getSelected();

        this.businessesListFiltered = this.businessesList.filter((businessModel: BusinessModel) => {
            var businessId = businessModel.getBusinessId();
            return businessSelected[businessId] && businessSelected[businessId].selected;
        }) as List<BusinessModel>;

        let arr = [];
        this.businessesListFiltered.forEach((businessModel: BusinessModel) => {
            let businessModelId = businessModel.getBusinessId();
            this.businessesUsers.forEach((businessUser: BusinessUser) => {
                var businessUserId = businessUser.getBusinessId();
                if (businessUserId == businessModelId) {
                    arr.push(businessUser);
                }
            })
        })
        this.businessUsersListFiltered = List<BusinessUser>(arr);
    }

    getBusinesses(businessItem: BusinessModel) {
        // console.log(Math.random());
        return businessItem.getKey('name') + ' (id:' + businessItem.getKey('businessId') + ')';
    }

    getBusinessesId() {
        return (businessItem: BusinessModel) => {
            return businessItem.getKey('businessId');
        }
    }

    destroty() {
        this.unsub();
        this.unsub2();
        this.unsub3();
    }
}

