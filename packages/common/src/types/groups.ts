import type { KnexPaginatedData } from './knex-paginate';

export type Group = {
    /**
     * The group's UUID
     */
    uuid: string;
    /**
     * A friendly name for the group
     */
    name: string;
    /**
     * The time that the group was created
     */
    createdAt: Date;
    /**
     * The UUID of the user that created the group
     */
    createdByUserUuid: string | null;
    /**
     * The time that the group was last updated
     */
    updatedAt: Date;
    /**
     * The UUID of the user that last updated the group
     */
    updatedByUserUuid: string | null;
    /**
     * The UUID of the organization that the group belongs to
     */
    organizationUuid: string;
};

export type CreateGroup = Pick<Group, 'name'> & {
    members?: Pick<GroupMember, 'userUuid'>[];
};

export type UpdateGroup = Pick<Group, 'name'>;

/**
 * A summary for a Lightdash user within a group
 */
export type GroupMember = {
    /**
     * Unique id for the user
     * @format uuid
     */
    userUuid: string;
    /**
     * Primary email address for the user
     */
    email: string;
    /**
     * The user's first name
     */
    firstName: string;
    /**
     * The user's last name
     */
    lastName: string;
};

export type GroupMembership = {
    groupUuid: string;
    userUuid: string;
};

/**
 * Details for a group including a list of the group's members.
 */
export type GroupWithMembers = Group & {
    /**
     * A list of the group's members.
     */
    members: GroupMember[];
    memberUuids: string[];
};

export function isGroupWithMembers(
    g: Group | GroupWithMembers,
): g is GroupWithMembers {
    return Boolean(
        'members' in g && g.members && 'memberUuids' in g && g.memberUuids,
    );
}

export type UpdateGroupWithMembers = {
    name?: string;
    members?: Pick<GroupMember, 'userUuid'>[];
};

export type ApiGroupMembersResponse = {
    status: 'ok';
    results: GroupMember[];
};

export type ApiGroupResponse = {
    status: 'ok';
    results: Group | GroupWithMembers;
};

export type ApiCreateGroupResponse = {
    status: 'ok';
    results: GroupWithMembers;
};

export type ApiGroupListResponse = {
    status: 'ok';
    results: KnexPaginatedData<Group[] | GroupWithMembers[]>;
};
