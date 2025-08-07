import { createClient } from '@/lib/supabase/client';

export interface SkillOrganizationData {
  id: string;
  name: string;
  type: 'folder' | 'skill' | 'target';
  parent_id?: string;
  skill_id?: string;
  flow_id?: string;
  data?: any;
  display_order: number;
  is_expanded: boolean;
  children?: SkillOrganizationData[];
}

export interface SkillNode {
  id: string;
  label: string;
  type: string;
  parentId?: string;
  children?: SkillNode[];
  flowId?: string;
  data?: any;
}

class SkillOrganizationService {
  private supabase = createClient();

  /**
   * Load custom organization data for a user
   */
  async loadCustomOrganization(userId: string): Promise<SkillOrganizationData[]> {
    try {
      console.log('[SkillOrganizationService] Loading custom organization for user:', userId);
      
      const { data, error } = await this.supabase
        .from('skill_organizations')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[SkillOrganizationService] Error loading custom organization:', error);
        throw error;
      }

      console.log('[SkillOrganizationService] Loaded organization data:', data);
      
      // Convert flat data to hierarchical structure
      return this.buildHierarchy(data || []);
    } catch (error) {
      console.error('[SkillOrganizationService] Failed to load custom organization:', error);
      return [];
    }
  }

  /**
   * Save custom organization data
   */
  async saveCustomOrganization(userId: string, folders: SkillNode[], customTree: SkillNode[]): Promise<void> {
    try {
      console.log('[SkillOrganizationService] Saving custom organization for user:', userId);
      
      // First, delete existing organization data for this user
      const { error: deleteError } = await this.supabase
        .from('skill_organizations')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('[SkillOrganizationService] Error deleting existing organization:', deleteError);
        throw deleteError;
      }

      // Step 1: Insert all nodes without parent relationships
      const allNodes = this.getAllNodes([...folders, ...customTree]);
      const insertData = allNodes.map((node, index) => ({
        user_id: userId,
        name: node.label,
        type: node.type.toLowerCase(), // Ensure type is lowercase to match the check constraint
        parent_id: null, // Will be updated in step 2
        skill_id: node.type.toLowerCase() === 'skill' ? node.id : null,
        flow_id: node.flowId || null,
        display_order: index,
        is_expanded: true
      }));

      console.log('[SkillOrganizationService] Step 1: Inserting nodes:', insertData);

      const { data: insertedNodes, error: insertError } = await this.supabase
        .from('skill_organizations')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error('[SkillOrganizationService] Insert error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
      }

      if (insertError) {
        console.error('[SkillOrganizationService] Error inserting nodes:', insertError);
        throw insertError;
      }

      // Step 2: Update parent relationships
      const parentUpdates = this.buildParentUpdates([...folders, ...customTree], insertedNodes);
      
      if (parentUpdates.length > 0) {
        console.log('[SkillOrganizationService] Step 2: Updating parent relationships:', parentUpdates);
        
        for (const update of parentUpdates) {
          const { error: updateError } = await this.supabase
            .from('skill_organizations')
            .update({ parent_id: update.parentId })
            .eq('id', update.childId);

          if (updateError) {
            console.error('[SkillOrganizationService] Error updating parent relationship:', updateError);
            throw updateError;
          }
        }
      }

      console.log('[SkillOrganizationService] Successfully saved custom organization');
    } catch (error) {
      console.error('[SkillOrganizationService] Failed to save custom organization:', error);
      throw error;
    }
  }

  /**
   * Get all nodes from hierarchical structure (flattened)
   */
  private getAllNodes(nodes: SkillNode[]): SkillNode[] {
    const allNodes: SkillNode[] = [];
    
    const traverse = (nodeList: SkillNode[]) => {
      nodeList.forEach(node => {
        allNodes.push(node);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    traverse(nodes);
    return allNodes;
  }

  /**
   * Build parent-child relationship updates
   */
  private buildParentUpdates(nodes: SkillNode[], insertedNodes: any[]): Array<{childId: string, parentId: string}> {
    const updates: Array<{childId: string, parentId: string}> = [];
    const nodeMap = new Map<string, any>();
    
    // First, build a map of original nodes to inserted nodes
    const buildNodeMap = (nodeList: SkillNode[], parentNode?: any) => {
      nodeList.forEach(node => {
        // For skills, match by skill_id, for folders match by name and type
        const insertedNode = node.type === 'skill' 
          ? insertedNodes.find(n => n.skill_id === node.id)
          : insertedNodes.find(n => n.name === node.label && n.type === node.type);
        
        if (insertedNode) {
          nodeMap.set(node.id, insertedNode);
        }
        
        if (node.children && node.children.length > 0) {
          buildNodeMap(node.children);
        }
      });
    };
    
    // Then, build the parent-child relationships
    const buildRelationships = (nodeList: SkillNode[], parentNode?: SkillNode) => {
      nodeList.forEach(node => {
        const insertedNode = nodeMap.get(node.id);
        const insertedParent = parentNode ? nodeMap.get(parentNode.id) : null;
        
        if (insertedNode && insertedParent) {
          updates.push({
            childId: insertedNode.id,
            parentId: insertedParent.id
          });
        }
        
        if (node.children && node.children.length > 0) {
          buildRelationships(node.children, node);
        }
      });
    };
    
    buildNodeMap(nodes);
    buildRelationships(nodes);
    return updates;
  }

  /**
   * Convert hierarchical data to flat structure for database storage
   */
  private flattenHierarchy(nodes: SkillNode[], userId: string, parentId?: string, order: number = 0): any[] {
    const flatData: any[] = [];
    
    nodes.forEach((node, index) => {
      const currentOrder = order + index;
      
      const flatNode = {
        user_id: userId,
        name: node.label,
        type: node.type,
        parent_id: parentId,
        skill_id: node.type === 'skill' ? node.id : null,
        flow_id: node.flowId || null,
        display_order: currentOrder,
        is_expanded: true // Default to expanded
      };
      
      flatData.push(flatNode);
      
      // Recursively process children
      if (node.children && node.children.length > 0) {
        const childData = this.flattenHierarchy(node.children, userId, undefined, currentOrder + 1);
        flatData.push(...childData);
      }
    });
    
    return flatData;
  }

  /**
   * Convert flat database data to hierarchical structure
   */
  private buildHierarchy(flatData: any[]): SkillOrganizationData[] {
    const nodeMap = new Map<string, SkillOrganizationData>();
    const rootNodes: SkillOrganizationData[] = [];
    
    // Create node map
    flatData.forEach(item => {
      nodeMap.set(item.id, {
        id: item.id,
        name: item.name,
        type: item.type,
        parent_id: item.parent_id,
        skill_id: item.skill_id,
        flow_id: item.flow_id,
        data: item.data,
        display_order: item.display_order,
        is_expanded: item.is_expanded,
        children: []
      });
    });
    
    // Build hierarchy
    flatData.forEach(item => {
      const node = nodeMap.get(item.id)!;
      
      if (item.parent_id) {
        const parent = nodeMap.get(item.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });
    
    // Sort by display_order
    const sortNodes = (nodes: SkillOrganizationData[]) => {
      nodes.sort((a, b) => a.display_order - b.display_order);
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };
    
    sortNodes(rootNodes);
    return rootNodes;
  }

  /**
   * Convert database organization data to SkillNode format for UI
   */
  convertToSkillNodes(orgData: SkillOrganizationData[]): SkillNode[] {
    const convertNode = (node: SkillOrganizationData): SkillNode => {
      return {
        id: node.id,
        label: node.name,
        type: node.type,
        children: node.children ? node.children.map(convertNode) : [],
        flowId: node.flow_id,
        data: node.data
      };
    };
    
    return orgData.map(convertNode);
  }
}

export const skillOrganizationService = new SkillOrganizationService(); 